import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  AcademicSessionStatus,
  StudentAcademicRecordStatus,
} from '../../../generated/prisma/enums';
import {
  ProgressionPreviewResponse,
  ProgressionStudentPreview,
  ImplementProgressionResponse,
} from '../types/progression.types';

import { ImplementProgressionDto } from '../dto/implement-progression.dto';

// ─── Helper ──────────────────────────────────────────────────────────────────

function fullName(
  first: string,
  middle: string | null,
  last: string | null,
): string {
  return [first, middle, last].filter(Boolean).join(' ');
}

@Injectable()
export class AcademicProgressionService {
  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════════════════════
  // PREVIEW
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Preview what the progression will look like for the given (or current ACTIVE) session.
   * Only students who already have at least one academic record are included.
   * Target semester = previous semester + 1 (capped by programDuration * 2).
   */
  async getPreview(
    academicSessionId?: string,
  ): Promise<ProgressionPreviewResponse> {
    // Resolve target session
    const session = academicSessionId
      ? await this.prisma.academicSession.findUnique({
          where: { id: academicSessionId },
          select: { id: true, name: true, status: true, progressed: true },
        })
      : await this.prisma.academicSession.findFirst({
          where: { status: AcademicSessionStatus.ACTIVE, progressed: false },
          select: { id: true, name: true, status: true, progressed: true },
          orderBy: { startDate: 'desc' },
        });

    if (!session) {
      throw new NotFoundException(
        academicSessionId
          ? `Academic session ${academicSessionId} not found`
          : 'No ACTIVE academic session found that has not been progressed yet',
      );
    }

    if (session.progressed) {
      throw new BadRequestException(
        `Session "${session.name}" has already been progressed`,
      );
    }

    // All active students that already have at least one academic record
    // (we take the most recent record that is NOT for the target session)
    const students = await this.prisma.student.findMany({
      where: {
        status: 'ACTIVE',
        academicRecords: {
          some: {
            academicSessionId: { not: session.id },
          },
        },
      },
      select: {
        id: true,
        stdRegNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        batchId: true,
        batch: {
          select: { id: true, name: true, programDuration: true },
        },
        academicRecords: {
          where: { academicSessionId: { not: session.id } },
          orderBy: { semesterNumber: 'desc' },
          take: 1,
          select: {
            semesterNumber: true,
            sectionId: true,
            section: { select: { name: true } },
          },
        },
      },
      orderBy: [{ batch: { name: 'asc' } }, { stdRegNumber: 'asc' }],
    });

    const previewStudents: ProgressionStudentPreview[] = students.map((s) => {
      const latest = s.academicRecords[0];
      const currentSemester = latest.semesterNumber;
      const maxSemester = s.batch.programDuration * 2; // e.g. 4 years → 8 semesters

      const targetSemester = Math.min(currentSemester + 1, maxSemester);

      return {
        studentId: s.id,
        regNumber: s.stdRegNumber,
        fullName: fullName(s.firstName, s.middleName, s.lastName),
        batchId: s.batch.id,
        batchName: s.batch.name,
        currentSemester,
        targetSemester,
        currentSectionId: latest.sectionId,
        currentSectionName: latest.section?.name ?? null,
      };
    });

    return {
      academicSessionId: session.id,
      academicSessionName: session.name,
      totalStudents: previewStudents.length,
      students: previewStudents,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // IMPLEMENT (the only write operation)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Creates new StudentAcademicRecords for the target session.
   * - Uses previous sectionId (kept the same)
   * - semesterNumber = previous + 1 (or manual adjustment)
   * - Marks the session as progressed
   */
  async implement(
    dto: ImplementProgressionDto,
  ): Promise<ImplementProgressionResponse> {
    const session = await this.prisma.academicSession.findUnique({
      where: { id: dto.academicSessionId },
      select: { id: true, name: true, status: true, progressed: true },
    });

    if (!session) {
      throw new NotFoundException(
        `Academic session ${dto.academicSessionId} not found`,
      );
    }

    if (session.progressed) {
      throw new ConflictException(
        `Session "${session.name}" has already been progressed`,
      );
    }

    // Build adjustment map
    const adjustmentMap = new Map<string, number>();
    if (dto.adjustments?.length) {
      for (const adj of dto.adjustments) {
        if (adj.targetSemester < 1 || adj.targetSemester > 12) {
          throw new BadRequestException(
            `Invalid targetSemester ${adj.targetSemester} for student ${adj.studentId}`,
          );
        }
        adjustmentMap.set(adj.studentId, adj.targetSemester);
      }
    }

    // Re-compute the same set of students (same logic as preview)
    const students = await this.prisma.student.findMany({
      where: {
        status: 'ACTIVE',
        academicRecords: {
          some: {
            academicSessionId: { not: session.id },
          },
        },
      },
      select: {
        id: true,
        batchId: true,
        batch: { select: { programDuration: true } },
        academicRecords: {
          where: { academicSessionId: { not: session.id } },
          orderBy: { semesterNumber: 'desc' },
          take: 1,
          select: {
            semesterNumber: true,
            sectionId: true,
          },
        },
      },
    });

    if (students.length === 0) {
      throw new BadRequestException(
        'No eligible students found for progression',
      );
    }

    // Guard: none of them should already have a record for the target session
    const alreadyEnrolled = await this.prisma.studentAcademicRecord.findMany({
      where: {
        academicSessionId: session.id,
        studentId: { in: students.map((s) => s.id) },
      },
      select: { studentId: true },
    });

    if (alreadyEnrolled.length > 0) {
      throw new ConflictException(
        `${alreadyEnrolled.length} student(s) already have a record for this session. Aborting.`,
      );
    }

    const createdCount = await this.prisma.$transaction(async (tx) => {
      let count = 0;

      for (const s of students) {
        const latest = s.academicRecords[0];
        const maxSemester = s.batch.programDuration * 2;

        const targetSemester =
          adjustmentMap.get(s.id) ??
          Math.min(latest.semesterNumber + 1, maxSemester);

        await tx.studentAcademicRecord.create({
          data: {
            studentId: s.id,
            batchId: s.batchId,
            academicSessionId: session.id,
            semesterNumber: targetSemester,
            sectionId: latest.sectionId, // keep the same section
            status: StudentAcademicRecordStatus.ENROLLED,
          },
        });

        count++;
      }

      // Mark session as progressed
      await tx.academicSession.update({
        where: { id: session.id },
        data: { progressed: true },
      });

      return count;
    });

    return {
      message: `Progression completed successfully for session "${session.name}"`,
      createdCount,
      academicSessionId: session.id,
    };
  }
}
