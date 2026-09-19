import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateAcademicSessionDto } from '../dto/update-academic-session.dto';
import { CreateAcademicSessionDto } from '../dto/create-academic-session.dto';
import { AcademicSessionResponse } from '../types/academic.types';
import { Prisma } from '../../../generated/prisma/client';
import { AcademicSessionStatus } from '../../../generated/prisma/enums';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class AcademicSessionsService {
  constructor(private prisma: PrismaService) {}

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
        status: dto.status ?? AcademicSessionStatus.UPCOMING,
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

    return this.prisma.academicSession.findMany({
      where: {
        ...(status && { status }),
        ...(academicYearId && { academicYearId }),
      },
      orderBy: {
        startDate: 'desc',
      },
      include: {
        academicYear: true,
      },
    });
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

  async update(id: string, dto: UpdateAcademicSessionDto) {
    await this.findOne(id);

    const data: Prisma.AcademicSessionUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.startDate !== undefined && {
        startDate: new Date(dto.startDate),
      }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
      ...(dto.status !== undefined && { status: dto.status }),
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

  async activate(id: string) {
    const session = await this.findOne(id);

    if (session.status === AcademicSessionStatus.ACTIVE) {
      throw new BadRequestException('Session is already active');
    }

    if (
      session.status === AcademicSessionStatus.COMPLETED ||
      session.status === AcademicSessionStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot activate a session with status "${session.status}"`,
      );
    }

    // Deactivate any other active session in the same academic year
    await this.prisma.academicSession.updateMany({
      where: {
        academicYearId: session.academicYearId,
        status: AcademicSessionStatus.ACTIVE,
        id: { not: id },
      },
      data: {
        status: AcademicSessionStatus.COMPLETED,
      },
    });

    return this.prisma.academicSession.update({
      where: { id },
      data: {
        status: AcademicSessionStatus.ACTIVE,
      },
    });
  }

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

    return this.prisma.academicSession.update({
      where: { id },
      data: {
        status: AcademicSessionStatus.COMPLETED,
      },
    });
  }
}
