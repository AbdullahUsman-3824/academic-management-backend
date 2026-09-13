import { Injectable, BadRequestException } from '@nestjs/common';
import { AcademicYearsService } from './academic-years.service';
import { AcademicSessionsService } from './academic-sessions.service';
import { BatchService } from './batch.service';
import { PrismaService } from '../../../database/prisma.service';
import { AcademicSetupDto } from '../dto/academic-setup.dto';
import { SetupResponse } from '../types/academic.types';
import { AcademicSessionResponse } from '../types/academic.types';

@Injectable()
export class AcademicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicYearService: AcademicYearsService,
    private readonly academicSessionService: AcademicSessionsService,
    private readonly batchService: BatchService,
  ) {}

  async setup(dto: AcademicSetupDto): Promise<SetupResponse> {
    const { sessions, batch, year } = dto;

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
    const overlaps = first.start < second.end && second.start < first.end;
    if (overlaps) {
      throw new BadRequestException('Academic sessions must not overlap');
    }

    return this.prisma.$transaction(async (tx) => {
      const academicYear = await this.academicYearService.create(year, tx);

      const academicSessions: AcademicSessionResponse[] = [];
      for (const sessionDto of sessions) {
        const created = await this.academicSessionService.create(
          { ...sessionDto, academicYearId: academicYear.id },
          tx,
        );
        academicSessions.push(created);
      }

      const createdBatch = await this.batchService.create(batch, tx);

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
        where: { status: 'active' },
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
        where: { status: 'active' },
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
        where: { status: 'active' },
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
