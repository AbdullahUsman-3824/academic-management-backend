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
  ProgressionBatchPreview,
  ProgressionTransitionPreview,
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

function groupKey(batchId: string, from: number, to: number): string {
  return `${batchId}:${from}:${to}`;
}

@Injectable()
export class AcademicProgressionService {
  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════════════════════
  // SHARED HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Session resolve + validate. Preview aur implement dono yehi use karte hain.
   */
  private async resolveSessionForProgression(academicSessionId?: string) {
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

    if (session.status !== AcademicSessionStatus.ACTIVE) {
      throw new BadRequestException(`Session "${session.name}" is not ACTIVE`);
    }

    if (session.progressed) {
      throw new ConflictException(
        `Session "${session.name}" has already been progressed`,
      );
    }

    return session;
  }

  /**
   * Eligible students: ACTIVE, kisi purane session me record hai,
   * aur target session me abhi record nahi hai.
   */
  private async getEligibleStudents(sessionId: string) {
    return this.prisma.student.findMany({
      where: {
        status: { equals: 'ACTIVE', mode: 'insensitive' },
        AND: [
          {
            academicRecords: {
              some: { academicSessionId: { not: sessionId } },
            },
          },
          { academicRecords: { none: { academicSessionId: sessionId } } },
        ],
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
          where: { academicSessionId: { not: sessionId } },
          orderBy: { semesterNumber: 'desc' },
          take: 1,
          select: {
            semesterNumber: true,
            semesterId: true,
            semester: { select: { id: true, number: true, name: true } },
            sectionId: true,
            section: { select: { name: true } },
          },
        },
      },
      orderBy: [{ batch: { name: 'asc' } }, { stdRegNumber: 'asc' }],
    });
  }

  /**
   * Student ka current aur default target semester number.
   * Preview aur implement dono me same logic.
   */
  private computeSemesters(
    latest: { semesterNumber: number; semester: { number: number } | null },
    programDuration: number,
  ) {
    const current = latest.semester?.number ?? latest.semesterNumber;
    const max = programDuration * 2; // 4 years -> 8 semesters
    const target = Math.min(current + 1, max);
    return { current, target };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PREVIEW (read only)
  // ══════════════════════════════════════════════════════════════════════════

  async getPreview(
    academicSessionId?: string,
  ): Promise<ProgressionPreviewResponse> {
    const session = await this.resolveSessionForProgression(academicSessionId);

    const semesters = await this.prisma.semester.findMany({
      select: { id: true, number: true, name: true },
      orderBy: { number: 'asc' },
    });
    const semesterMap = new Map(semesters.map((s) => [s.number, s]));

    const students = await this.getEligibleStudents(session.id);
    console.log(
      `Eligible students for session ${session.name}: ${students.length}`,
    );

    const batchMap = new Map<
      string,
      {
        batchId: string;
        batchName: string;
        totalStudents: number;
        transitions: Map<string, ProgressionTransitionPreview>;
      }
    >();

    for (const s of students) {
      const latest = s.academicRecords[0];
      const { current, target } = this.computeSemesters(
        latest,
        s.batch.programDuration,
      );

      const currentSem = semesterMap.get(current);
      const targetSem = semesterMap.get(target);

      let batchBucket = batchMap.get(s.batch.id);
      if (!batchBucket) {
        batchBucket = {
          batchId: s.batch.id,
          batchName: s.batch.name,
          totalStudents: 0,
          transitions: new Map(),
        };
        batchMap.set(s.batch.id, batchBucket);
      }

      const key = `${current}:${target}`;
      let transition = batchBucket.transitions.get(key);
      if (!transition) {
        transition = {
          fromSemester: current,
          fromSemesterId: latest.semester?.id ?? currentSem?.id ?? null,
          fromSemesterName: latest.semester?.name ?? currentSem?.name ?? null,
          toSemester: target,
          toSemesterId: targetSem?.id ?? null,
          toSemesterName: targetSem?.name ?? null,
          isFinal: target === current,
          missingTargetSemester: !targetSem,
          count: 0,
          students: [],
        };
        batchBucket.transitions.set(key, transition);
      }

      transition.students.push({
        studentId: s.id,
        regNumber: s.stdRegNumber,
        fullName: fullName(s.firstName, s.middleName, s.lastName),
        currentSectionId: latest.sectionId,
        currentSectionName: latest.section?.name ?? null,
      });
      transition.count++;
      batchBucket.totalStudents++;
    }

    const batches: ProgressionBatchPreview[] = [...batchMap.values()].map(
      (b) => ({
        batchId: b.batchId,
        batchName: b.batchName,
        totalStudents: b.totalStudents,
        transitions: [...b.transitions.values()].sort(
          (a, c) => a.fromSemester - c.fromSemester,
        ),
      }),
    );

    return {
      academicSessionId: session.id,
      academicSessionName: session.name,
      totalStudents: students.length,
      totalBatches: batches.length,
      batches,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // IMPLEMENT (the only write operation)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Eligible students ke liye naye StudentAcademicRecords banata hai,
   * siwaye excluded students/groups ke.
   * - Section wahi rehta hai jo pichle record me tha
   * - Adjustment ho to wo default target ko override karta hai
   * - Session ko progressed mark karta hai (atomic)
   */
  async implement(
    dto: ImplementProgressionDto,
  ): Promise<ImplementProgressionResponse> {
    const session = await this.resolveSessionForProgression(
      dto.academicSessionId,
    );

    // ── Adjustments validate ────────────────────────────────────────────────
    const adjustmentMap = new Map<string, number>();
    for (const adj of dto.adjustments ?? []) {
      if (adj.targetSemester < 1 || adj.targetSemester > 12) {
        throw new BadRequestException(
          `Invalid targetSemester ${adj.targetSemester} for student ${adj.studentId}`,
        );
      }
      adjustmentMap.set(adj.studentId, adj.targetSemester);
    }

    // ── Exclusions ──────────────────────────────────────────────────────────
    const excludedIds = new Set(dto.excludedStudentIds ?? []);
    const excludedKeys = new Set(
      (dto.excludedGroups ?? []).map((g) =>
        groupKey(g.batchId, g.fromSemester, g.toSemester),
      ),
    );

    // ── Semesters + eligible students (same logic as preview) ───────────────
    const semesters = await this.prisma.semester.findMany({
      select: { id: true, number: true },
    });
    const semesterMap = new Map(semesters.map((s) => [s.number, s.id]));

    const students = await this.getEligibleStudents(session.id);

    // Adjustment kisi non eligible student ke liye ho to error do
    const eligibleIds = new Set(students.map((s) => s.id));
    for (const studentId of adjustmentMap.keys()) {
      if (!eligibleIds.has(studentId)) {
        throw new BadRequestException(
          `Adjustment given for student ${studentId} who is not eligible for progression`,
        );
      }
    }

    // ── Rows build karo (transaction se pehle, taake errors jaldi aayen) ────
    const rows: {
      studentId: string;
      batchId: string;
      academicSessionId: string;
      semesterId: string;
      semesterNumber: number;
      sectionId: string;
      status: StudentAcademicRecordStatus;
    }[] = [];
    let skippedCount = 0;

    for (const s of students) {
      const latest = s.academicRecords[0];
      const { current, target: defaultTarget } = this.computeSemesters(
        latest,
        s.batch.programDuration,
      );

      // Group key hamesha default target se banta hai (preview me yehi tha),
      // adjustment se nahi.
      const key = groupKey(s.batchId, current, defaultTarget);
      if (excludedIds.has(s.id) || excludedKeys.has(key)) {
        skippedCount++;
        continue;
      }

      const targetSemesterNumber = adjustmentMap.get(s.id) ?? defaultTarget;
      const targetSemesterId = semesterMap.get(targetSemesterNumber);
      if (!targetSemesterId) {
        throw new BadRequestException(
          `Semester ${targetSemesterNumber} not found in database`,
        );
      }

      rows.push({
        studentId: s.id,
        batchId: s.batchId,
        academicSessionId: session.id,
        semesterId: targetSemesterId,
        semesterNumber: targetSemesterNumber, // backward compatibility
        sectionId: latest.sectionId, // same section
        status: StudentAcademicRecordStatus.ENROLLED,
      });
    }

    if (rows.length === 0) {
      throw new BadRequestException(
        students.length === 0
          ? 'No eligible students found for progression'
          : 'All eligible students were excluded, nothing to progress',
      );
    }

    // ── Write: ek transaction, createMany, atomic claim ─────────────────────
    const createdCount = await this.prisma.$transaction(
      async (tx) => {
        // Double run se bachao
        const claimed = await tx.academicSession.updateMany({
          where: { id: session.id, progressed: false },
          data: { progressed: true },
        });
        if (claimed.count === 0) {
          throw new ConflictException(
            `Session "${session.name}" has already been progressed`,
          );
        }

        const studentIdsToPromote = rows.map((r) => r.studentId);

        // Sirf ENROLLED status wale previous records ko PROMOTED karo
        await tx.studentAcademicRecord.updateMany({
          where: {
            studentId: { in: studentIdsToPromote },
            academicSessionId: { not: session.id },
            status: StudentAcademicRecordStatus.ENROLLED,
          },
          data: {
            status: StudentAcademicRecordStatus.PROMOTED,
          },
        });

        // Naye records create karo
        const result = await tx.studentAcademicRecord.createMany({
          data: rows,
        });

        return result.count;
      },
      { timeout: 30000 },
    );

    return {
      message: `Progression completed successfully for session "${session.name}"`,
      createdCount,
      skippedCount,
      academicSessionId: session.id,
    };
  }
}
