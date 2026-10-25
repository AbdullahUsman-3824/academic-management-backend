import { Injectable, BadRequestException } from '@nestjs/common';
import { AcademicYearsService } from './academic-years.service';
import { AcademicSessionsService } from './academic-sessions.service';
import { BatchService } from './batch.service';
import { PrismaService } from '../../../database/prisma.service';
import { AcademicSetupDto } from '../dto/academic-setup.dto';
import { SetupResponse } from '../types/academic.types';
import { AcademicSessionResponse } from '../types/academic.types';
import {
  AcademicYearStatus,
  AcademicSessionStatus,
  BatchStatus,
} from '../../../generated/prisma/enums';

@Injectable()
export class AcademicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicYearService: AcademicYearsService,
    private readonly academicSessionService: AcademicSessionsService,
    private readonly batchService: BatchService,
  ) {}

  /**
   * Setup is the ONLY place year, sessions and batch are created.
   *
   * Status assignment on create:
   *  - Year          → inactive
   *  - Session #1 (earliest by startDate) → upcoming
   *  - Session #2                         → inactive
   *  - Batch         → active  (multiple batches may be active simultaneously)
   *
   * If any year/session is currently active, they are marked completed
   * before the new records are inserted.
   */
  async setup(dto: AcademicSetupDto): Promise<SetupResponse> {
    const { sessions, year } = dto;

    if (!sessions || sessions.length !== 2) {
      throw new BadRequestException(
        'Academic setup requires exactly two academic sessions',
      );
    }

    const yearStart = new Date(year.startDate);
    const yearEnd = new Date(year.endDate);

    if (yearEnd <= yearStart) {
      throw new BadRequestException(
        'Academic year end date must be after start date',
      );
    }

    // ---------- Overlap check for Academic Year (DB se) ----------
    const overlappingYear = await this.prisma.academicYear.findFirst({
      where: {
        AND: [{ startDate: { lt: yearEnd } }, { endDate: { gt: yearStart } }],
      },
    });

    if (overlappingYear) {
      throw new BadRequestException(
        `Academic year dates overlap with existing year "${overlappingYear.name}" (${overlappingYear.startDate.toISOString().slice(0, 10)} - ${overlappingYear.endDate.toISOString().slice(0, 10)})`,
      );
    }

    // ---------- Session validations ----------
    const parsed = sessions.map((s) => ({
      dto: s,
      start: new Date(s.startDate),
      end: new Date(s.endDate),
    }));

    for (const s of parsed) {
      if (s.end <= s.start) {
        throw new BadRequestException(
          `Session "${s.dto.name}" end date must be after start date`,
        );
      }
      if (s.start < yearStart || s.end > yearEnd) {
        throw new BadRequestException(
          `Session "${s.dto.name}" dates must fall within the academic year's date range`,
        );
      }
    }

    const [first, second] = parsed;
    const sessionsOverlap =
      first.start < second.end && second.start < first.end;
    if (sessionsOverlap) {
      throw new BadRequestException('Academic sessions must not overlap');
    }

    return this.prisma.$transaction(async (tx) => {
      // Complete any active sessions before creating the new year/sessions
      await tx.academicSession.updateMany({
        where: { status: AcademicSessionStatus.ACTIVE },
        data: { status: AcademicSessionStatus.COMPLETED },
      });

      // Also complete any active year
      await tx.academicYear.updateMany({
        where: { status: AcademicYearStatus.ACTIVE },
        data: { status: AcademicYearStatus.COMPLETED },
      });

      // Year starts inactive
      const academicYear = await this.academicYearService.create(year, tx);

      // First session (by date) → upcoming, second → inactive
      const academicSessions: AcademicSessionResponse[] = [];

      const firstCreated = await this.academicSessionService.create(
        {
          ...first.dto,
          academicYearId: academicYear.id,
          status: AcademicSessionStatus.UPCOMING,
        },
        tx,
      );
      academicSessions.push(firstCreated);

      const secondCreated = await this.academicSessionService.create(
        {
          ...second.dto,
          academicYearId: academicYear.id,
          status: AcademicSessionStatus.INACTIVE,
        },
        tx,
      );
      academicSessions.push(secondCreated);

      // Batch always active; multiple active batches allowed
      const createdBatch = await this.batchService.create(
        {
          name: academicYear.name,
          entryYearId: academicYear.id,
        },
        tx,
      );

      return { academicYear, academicSessions, batch: createdBatch };
    });
  }

  async getOverview() {
    const [
      currentYear,
      currentSession,
      academicYearsCount,
      activeBatchesCount,
    ] = await this.prisma.$transaction([
      // Current active academic year
      this.prisma.academicYear.findFirst({
        where: { status: AcademicYearStatus.ACTIVE },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      }),

      // Current active session (can be null)
      this.prisma.academicSession.findFirst({
        where: { status: AcademicSessionStatus.ACTIVE },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      }),

      // Total academic years
      this.prisma.academicYear.count(),

      // Active batches count
      this.prisma.batch.count({
        where: { status: BatchStatus.ACTIVE },
      }),
    ]);

    return {
      currentYear,
      currentSession,
      statistics: {
        academicYears: academicYearsCount,
        activeBatches: activeBatchesCount,
      },
    };
  }
}
