import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateAcademicSessionDto,
  UpdateAcademicSessionDto,
} from '../dto/academic-session.dto';
import { AcademicSessionResponse } from '../types/academic.types';
import { Prisma } from '../../../generated/prisma/client';
import {
  AcademicSessionStatus,
  AcademicYearStatus,
} from '../../../generated/prisma/enums';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class AcademicSessionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create is only called from setup.
   * Status is forced by the setup flow (first by date → upcoming, second → inactive).
   * Any previously active session is marked completed when a new setup runs.
   */
  async create(
    dto: CreateAcademicSessionDto,
    tx?: TxClient,
  ): Promise<AcademicSessionResponse> {
    const client = tx ?? this.prisma;

    const year = await client.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });

    if (!year) {
      throw new NotFoundException(
        `Academic Year with id ${dto.academicYearId} not found`,
      );
    }

    const session = await client.academicSession.create({
      data: {
        academicYearId: dto.academicYearId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: dto.status ?? AcademicSessionStatus.INACTIVE,
      },
    });

    return {
      ...session,
      status: session.status,
    };
  }

  async findAll(params?: {
    status?: AcademicSessionStatus;
    academicYearId?: string;
  }) {
    const { status, academicYearId } = params || {};

    if (status && !Object.values(AcademicSessionStatus).includes(status)) {
      throw new BadRequestException(
        `Invalid status "${status}". Allowed values: ${Object.values(AcademicSessionStatus).join(', ')}`,
      );
    }

    const sessions = await this.prisma.academicSession.findMany({
      where: {
        ...(status && { status }),
        ...(academicYearId && { academicYearId }),
      },
      include: {
        academicYear: true,
      },
    });

    return this.sortSessions(sessions);
  }

  /**
   * Lightweight list – only id + name
   */
  async listForSelect(params?: {
    academicYearId?: string;
    status?: AcademicSessionStatus;
  }) {
    const { academicYearId, status } = params || {};

    const sessions = await this.prisma.academicSession.findMany({
      where: {
        ...(academicYearId && { academicYearId }),
        ...(status && { status }),
      },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
      },
    });

    return this.sortSessions(sessions).map((s) => ({
      id: s.id,
      name: s.name,
    }));
  }

  async findOne(id: string) {
    const session = await this.prisma.academicSession.findUnique({
      where: { id },
      include: {
        academicYear: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Academic Session with id ${id} not found`);
    }

    return session;
  }

  /**
   * Edit rules:
   * - upcoming / inactive → full edit (name + dates)
   * - active → only name can be changed; dates locked
   * - completed / cancelled → no edits
   */
  async update(id: string, dto: UpdateAcademicSessionDto) {
    const session = await this.findOne(id);

    if (
      session.status === AcademicSessionStatus.COMPLETED ||
      session.status === AcademicSessionStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot edit a session with status "${session.status}"`,
      );
    }

    if (
      session.status === AcademicSessionStatus.ACTIVE &&
      (dto.startDate !== undefined || dto.endDate !== undefined)
    ) {
      throw new BadRequestException(
        'Cannot change dates of an active session. Only name can be updated.',
      );
    }

    // Status changes must go through activate() / complete() — not free-form update
    if (dto.status !== undefined) {
      throw new BadRequestException(
        'Status cannot be changed via update. Use activate or complete endpoints.',
      );
    }

    const data: Prisma.AcademicSessionUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.startDate !== undefined && {
        startDate: new Date(dto.startDate),
      }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
      ...(dto.academicYearId !== undefined && {
        academicYear: { connect: { id: dto.academicYearId } },
      }),
    };

    return this.prisma.academicSession.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.academicSession.delete({
      where: { id },
    });
  }

  /**
   * Only an UPCOMING session can be activated.
   * Side-effects:
   *  1. Mark any other active session (same year or globally) as completed
   *  2. Set this session → active
   *  3. Set its academic year → active
   *  4. Promote the next chronological session of the same year from inactive → upcoming
   */
  async activate(id: string) {
    const session = await this.findOne(id);

    if (session.status === AcademicSessionStatus.ACTIVE) {
      throw new BadRequestException('Session is already active');
    }

    if (session.status !== AcademicSessionStatus.UPCOMING) {
      throw new BadRequestException(
        `Only upcoming sessions can be activated. Current status: "${session.status}"`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Complete any currently active session (across all years)
      await tx.academicSession.updateMany({
        where: {
          status: AcademicSessionStatus.ACTIVE,
          id: { not: id },
        },
        data: { status: AcademicSessionStatus.COMPLETED },
      });

      // 2. Activate this session
      const activated = await tx.academicSession.update({
        where: { id },
        data: { status: AcademicSessionStatus.ACTIVE },
      });

      // 3. Activate the parent year
      await tx.academicYear.update({
        where: { id: session.academicYearId },
        data: { status: AcademicYearStatus.ACTIVE },
      });

      // 4. Promote the next session (by startDate) of the same year from inactive → upcoming
      const nextSession = await tx.academicSession.findFirst({
        where: {
          academicYearId: session.academicYearId,
          status: AcademicSessionStatus.INACTIVE,
          startDate: { gt: session.startDate },
        },
        orderBy: { startDate: 'asc' },
      });

      if (nextSession) {
        await tx.academicSession.update({
          where: { id: nextSession.id },
          data: { status: AcademicSessionStatus.UPCOMING },
        });
      }

      return activated;
    });
  }

  /**
   * Only an ACTIVE session can be completed.
   * Side-effects (one-click cascade):
   *  1. This session → completed
   *  2. The next UPCOMING session of the same year → active
   *  3. If no next session remains (both done) → year → completed
   *     else the session after that (if any) stays / becomes upcoming
   */
  async complete(id: string) {
    const session = await this.findOne(id);

    if (session.status === AcademicSessionStatus.COMPLETED) {
      throw new BadRequestException('Session is already completed');
    }

    if (session.status !== AcademicSessionStatus.ACTIVE) {
      throw new BadRequestException(
        `Only active sessions can be completed. Current status: "${session.status}"`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Complete this session
      const completed = await tx.academicSession.update({
        where: { id },
        data: { status: AcademicSessionStatus.COMPLETED },
      });

      // 2. Find next upcoming session of the same year and activate it
      const nextSession = await tx.academicSession.findFirst({
        where: {
          academicYearId: session.academicYearId,
          status: AcademicSessionStatus.UPCOMING,
          startDate: { gt: session.startDate },
        },
        orderBy: { startDate: 'asc' },
      });

      if (nextSession) {
        await tx.academicSession.update({
          where: { id: nextSession.id },
          data: { status: AcademicSessionStatus.ACTIVE },
        });
        // Year stays active
      } else {
        // Both sessions of the year are now completed → mark year completed
        await tx.academicYear.update({
          where: { id: session.academicYearId },
          data: { status: AcademicYearStatus.COMPLETED },
        });
      }

      return completed;
    });
  }

  // Private helpers
  private static readonly STATUS_PRIORITY: Record<
    AcademicSessionStatus,
    number
  > = {
    ACTIVE: 0,
    UPCOMING: 1,
    INACTIVE: 2,
    COMPLETED: 3,
    CANCELLED: 4,
  };
  private sortSessions<
    T extends { status: AcademicSessionStatus; startDate: Date },
  >(sessions: T[]): T[] {
    return sessions.sort((a, b) => {
      const pA = AcademicSessionsService.STATUS_PRIORITY[a.status] ?? 99;
      const pB = AcademicSessionsService.STATUS_PRIORITY[b.status] ?? 99;

      if (pA !== pB) return pA - pB;

      // UPCOMING / INACTIVE → earliest first; others → most recent first
      if (
        a.status === AcademicSessionStatus.UPCOMING ||
        a.status === AcademicSessionStatus.INACTIVE
      ) {
        return a.startDate.getTime() - b.startDate.getTime();
      }
      return b.startDate.getTime() - a.startDate.getTime();
    });
  }
}
