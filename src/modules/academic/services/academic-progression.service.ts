import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SectionService } from './section.service';
import {
  AcademicSessionStatus,
  ProgressionStatus,
  StudentAcademicRecordStatus,
} from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';

import { StartProgressionDto } from '../dto/start-progression.dto';
import {
  ConfirmWithRecordDto,
  WithRecordMode,
} from '../dto/confirm-with-record.dto';
import { AssignSemesterDto } from '../dto/assign-semester.dto';
import { AssignSectionsDto, SectionStrategy } from '../dto/assign-sections.dto';

import type {
  StoredWithRecordDecision,
  StoredWithoutRecordDecision,
  StoredSectionDecision,
  // StoredBatchSectionSplit,
  BatchProgressionSummary,
  StudentPreviewItem,
  ProgressionPreviewResponse,
  FinalPreviewResponse,
  ProgressionCheckResponse,
  ProgressionStartResponse,
  SectionAssignment,
  BatchSectionBreakdown,
} from '../types/progression.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Full name from nullable parts */
function fullName(
  first: string,
  middle: string | null,
  last: string | null,
): string {
  return [first, middle, last].filter(Boolean).join(' ');
}

/**
 * Ordered statuses that are considered "in-progress" (not terminal).
 * Used to guard against starting a second progression while one is active.
 */
const ACTIVE_STATUSES: ProgressionStatus[] = [
  ProgressionStatus.draft,
  ProgressionStatus.with_record_done,
  ProgressionStatus.semester_assigned,
  ProgressionStatus.sections_assigned,
  ProgressionStatus.final_preview,
];

@Injectable()
export class AcademicProgressionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sectionService: SectionService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // CHECK — can a progression be started / resumed?
  // ══════════════════════════════════════════════════════════════════════════

  async check(): Promise<ProgressionCheckResponse> {
    // 1. Is there an active session?
    const activeSession = await this.prisma.academicSession.findFirst({
      where: { status: AcademicSessionStatus.ACTIVE, progressed: false },
      select: { id: true, name: true },
    });

    if (!activeSession) {
      return {
        canStart: false,
        reason:
          'No active academic session found. Please activate a session first.',
      };
    }

    // 2. Is there already a progression (active or resumable) for this session?
    const existing = await this.prisma.academicProgression.findFirst({
      where: {
        academicSessionId: activeSession.id,
        status: { in: ACTIVE_STATUSES },
      },
      select: { id: true, status: true, currentStep: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      canStart: true,
      activeSession,
      existingProgression: existing
        ? {
            id: existing.id,
            status: existing.status,
            currentStep: existing.currentStep,
          }
        : undefined,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // START — create or resume progression
  // ══════════════════════════════════════════════════════════════════════════

  async start(
    dto: StartProgressionDto,
    userId?: string,
  ): Promise<ProgressionStartResponse> {
    // Verify the session exists and is active
    const session = await this.prisma.academicSession.findUnique({
      where: { id: dto.academicSessionId },
      select: { id: true, status: true },
    });

    if (!session) {
      throw new NotFoundException(
        `Academic session ${dto.academicSessionId} not found.`,
      );
    }

    if (session.status !== AcademicSessionStatus.ACTIVE) {
      throw new BadRequestException(
        'Academic Progression can only be started for an ACTIVE session.',
      );
    }

    // Idempotent: return existing draft/in-progress record for this session
    const existing = await this.prisma.academicProgression.findFirst({
      where: {
        academicSessionId: dto.academicSessionId,
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return {
        id: existing.id,
        academicSessionId: existing.academicSessionId,
        status: existing.status,
        currentStep: existing.currentStep,
        isResumed: true,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };
    }

    // Guard: no second locked/cancelled record leaking through
    const locked = await this.prisma.academicProgression.findFirst({
      where: {
        academicSessionId: dto.academicSessionId,
        status: ProgressionStatus.locked,
      },
    });

    if (locked) {
      throw new ConflictException(
        'A progression for this session has already been locked. No new progression can be started.',
      );
    }

    const progression = await this.prisma.academicProgression.create({
      data: {
        academicSessionId: dto.academicSessionId,
        status: ProgressionStatus.draft,
        currentStep: 'preview',
        ...(userId && { createdById: userId }),
      },
    });

    return {
      id: progression.id,
      academicSessionId: progression.academicSessionId,
      status: progression.status,
      currentStep: progression.currentStep,
      isResumed: false,
      createdAt: progression.createdAt,
      updatedAt: progression.updatedAt,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PREVIEW — calculate summary without touching permanent records
  // ══════════════════════════════════════════════════════════════════════════

  async getPreview(progressionId: string): Promise<ProgressionPreviewResponse> {
    const progression = await this.findActiveProgression(progressionId);

    const { batches } = await this.computeBatchSummaries(
      progression.academicSessionId,
      progression,
    );

    const totalWithRecord = batches.reduce((s, b) => s + b.withRecordCount, 0);
    const totalWithoutRecord = batches.reduce(
      (s, b) => s + b.withoutRecordCount,
      0,
    );

    return {
      progressionId: progression.id,
      academicSessionId: progression.academicSessionId,
      status: progression.status,
      totalWithRecord,
      totalWithoutRecord,
      batches,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONFIRM WITH-RECORD — save decision, advance status
  // ══════════════════════════════════════════════════════════════════════════

  async confirmWithRecord(
    progressionId: string,
    dto: ConfirmWithRecordDto,
  ): Promise<{ id: string; status: ProgressionStatus }> {
    // const progression = await this.findActiveProgression(progressionId);

    // Validate manual adjustments reference students that actually have records
    if (dto.mode === WithRecordMode.MANUAL && dto.adjustments?.length) {
      const studentIds = dto.adjustments.map((a) => a.studentId);
      const records = await this.prisma.studentAcademicRecord.findMany({
        where: {
          studentId: { in: studentIds },
          // Most recent record for each student — we check they exist at all
        },
        select: { studentId: true },
        distinct: ['studentId'],
      });

      const foundIds = new Set(records.map((r) => r.studentId));
      const missing = studentIds.filter((id) => !foundIds.has(id));
      if (missing.length) {
        throw new BadRequestException(
          `The following student IDs have no academic records and cannot be in withRecord adjustments: ${missing.join(', ')}`,
        );
      }
    }

    const decision: StoredWithRecordDecision = {
      mode: dto.mode,
      adjustments: dto.adjustments ?? [],
    };

    const updated = await this.prisma.academicProgression.update({
      where: { id: progressionId },
      data: {
        withRecordDecision: decision as unknown as Prisma.InputJsonValue,
        status: ProgressionStatus.with_record_done,
        currentStep: 'semester',
      },
      select: { id: true, status: true },
    });

    return updated;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ASSIGN SEMESTER (without-record students)
  // ══════════════════════════════════════════════════════════════════════════

  async assignSemester(
    progressionId: string,
    dto: AssignSemesterDto,
  ): Promise<{ id: string; status: ProgressionStatus }> {
    const progression = await this.findActiveProgression(progressionId);

    this.assertStatusAtLeast(
      progression.status,
      ProgressionStatus.with_record_done,
      progressionId,
    );

    const decision: StoredWithoutRecordDecision = {
      defaultSemester: dto.defaultSemester,
      batchOverrides: dto.batchOverrides ?? [],
      studentOverrides: dto.studentOverrides ?? [],
    };

    const updated = await this.prisma.academicProgression.update({
      where: { id: progressionId },
      data: {
        withoutRecordDecision: decision as unknown as Prisma.InputJsonValue,
        status: ProgressionStatus.semester_assigned,
        currentStep: 'sections',
      },
      select: { id: true, status: true },
    });

    return updated;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ASSIGN SECTIONS
  // ══════════════════════════════════════════════════════════════════════════

  async assignSections(
    progressionId: string,
    dto: AssignSectionsDto,
  ): Promise<{ id: string; status: ProgressionStatus }> {
    const progression = await this.findActiveProgression(progressionId);

    this.assertStatusAtLeast(
      progression.status,
      ProgressionStatus.semester_assigned,
      progressionId,
    );

    if (dto.strategy === SectionStrategy.CUSTOM && !dto.customSplits?.length) {
      throw new BadRequestException(
        "strategy 'custom' requires at least one entry in customSplits.",
      );
    }

    const decision: StoredSectionDecision = {
      strategy: dto.strategy,
      customSplits: dto.customSplits,
    };

    const updated = await this.prisma.academicProgression.update({
      where: { id: progressionId },
      data: {
        sectionDecision: decision as unknown as Prisma.InputJsonValue,
        status: ProgressionStatus.sections_assigned,
        currentStep: 'final_preview',
      },
      select: { id: true, status: true },
    });

    return updated;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FINAL PREVIEW — full calculated view before locking
  // ══════════════════════════════════════════════════════════════════════════

  async getFinalPreview(progressionId: string): Promise<FinalPreviewResponse> {
    const progression = await this.findActiveProgression(progressionId);

    this.assertStatusAtLeast(
      progression.status,
      ProgressionStatus.sections_assigned,
      progressionId,
    );

    const { batches } = await this.computeBatchSummaries(
      progression.academicSessionId,
      progression,
    );

    const sectionDecision =
      progression.sectionDecision as unknown as StoredSectionDecision | null;

    const sectionBreakdown = this.computeSectionBreakdown(
      batches,
      sectionDecision,
    );

    const totalWithRecord = batches.reduce((s, b) => s + b.withRecordCount, 0);
    const totalWithoutRecord = batches.reduce(
      (s, b) => s + b.withoutRecordCount,
      0,
    );

    // Advance status to final_preview (idempotent)
    if (progression.status === ProgressionStatus.sections_assigned) {
      await this.prisma.academicProgression.update({
        where: { id: progressionId },
        data: {
          status: ProgressionStatus.final_preview,
          currentStep: 'lock',
        },
      });
    }

    return {
      progressionId: progression.id,
      academicSessionId: progression.academicSessionId,
      status: ProgressionStatus.final_preview,
      totalWithRecord,
      totalWithoutRecord,
      batches,
      sectionBreakdown,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOCK — the only method that writes permanent records
  // ══════════════════════════════════════════════════════════════════════════

  async lock(
    progressionId: string,
  ): Promise<{ id: string; status: ProgressionStatus; lockedAt: Date }> {
    const progression = await this.findActiveProgression(progressionId);

    if (
      progression.status !== ProgressionStatus.final_preview &&
      progression.status !== ProgressionStatus.sections_assigned
    ) {
      throw new BadRequestException(
        `Progression must be in 'final_preview' or 'sections_assigned' status before locking. Current status: ${progression.status}`,
      );
    }

    const withRecordDecision =
      progression.withRecordDecision as unknown as StoredWithRecordDecision | null;
    const withoutRecordDecision =
      progression.withoutRecordDecision as unknown as StoredWithoutRecordDecision | null;
    const sectionDecision =
      progression.sectionDecision as unknown as StoredSectionDecision | null;

    if (!withRecordDecision) {
      throw new BadRequestException(
        'withRecord decision is missing. Complete step 1 first.',
      );
    }
    if (!withoutRecordDecision) {
      throw new BadRequestException(
        'withoutRecord semester decision is missing. Complete step 2 first.',
      );
    }
    if (!sectionDecision) {
      throw new BadRequestException(
        'Section decision is missing. Complete step 3 first.',
      );
    }

    // Load all data needed before the transaction
    const { batches } = await this.computeBatchSummaries(
      progression.academicSessionId,
      progression,
    );

    const lockedAt = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const batch of batches) {
          // ── Students WITH existing records ────────────────────────────────
          if (batch.withRecordStudents.length > 0) {
            // Resolve section to use: find or create default section for batch
            const defaultSection =
              await this.sectionService.ensureDefaultSection(batch.batchId, tx);

            for (const student of batch.withRecordStudents) {
              const sectionId = student.sectionId ?? defaultSection.id;

              // Upsert so the call is idempotent even if partially applied before
              await tx.studentAcademicRecord.upsert({
                where: {
                  studentId_academicSessionId: {
                    studentId: student.studentId,
                    academicSessionId: progression.academicSessionId,
                  },
                },
                create: {
                  studentId: student.studentId,
                  batchId: batch.batchId,
                  academicSessionId: progression.academicSessionId,
                  semesterNumber: student.targetSemester,
                  sectionId,
                  status: StudentAcademicRecordStatus.ENROLLED,
                },
                update: {
                  semesterNumber: student.targetSemester,
                  sectionId,
                  status: StudentAcademicRecordStatus.ENROLLED,
                },
              });
            }
          }

          // ── Students WITHOUT existing records ─────────────────────────────
          if (batch.withoutRecordStudents.length > 0) {
            const sectionsForBatch =
              await this.sectionService.resolveSectionAssignments(
                batch.batchId,
                batch.withoutRecordStudents,
                sectionDecision.strategy,
                sectionDecision.customSplits,
                tx,
              );

            for (const assignment of sectionsForBatch) {
              for (const student of assignment.students) {
                const targetSemester =
                  batch.withoutRecordStudents.find(
                    (s) => s.studentId === student.studentId,
                  )?.targetSemester ?? withoutRecordDecision.defaultSemester;

                await tx.studentAcademicRecord.upsert({
                  where: {
                    studentId_academicSessionId: {
                      studentId: student.studentId,
                      academicSessionId: progression.academicSessionId,
                    },
                  },
                  create: {
                    studentId: student.studentId,
                    batchId: batch.batchId,
                    academicSessionId: progression.academicSessionId,
                    semesterNumber: targetSemester,
                    sectionId: assignment.sectionId,
                    status: StudentAcademicRecordStatus.ENROLLED,
                  },
                  update: {
                    semesterNumber: targetSemester,
                    sectionId: assignment.sectionId,
                    status: StudentAcademicRecordStatus.ENROLLED,
                  },
                });
              }
            }
          }
        }

        // Mark session as progressed
        await tx.academicSession.update({
          where: { id: progression.academicSessionId },
          data: { progressed: true },
        });

        // Mark progression as locked — only after all writes succeed
        await tx.academicProgression.update({
          where: { id: progressionId },
          data: {
            status: ProgressionStatus.locked,
            currentStep: null,
            lockedAt,
          },
        });
      });
    } catch (err) {
      // Transaction rolled back automatically; rethrow with context
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Failed to lock progression. The transaction was rolled back. No permanent records were written.',
      );
    }

    return { id: progressionId, status: ProgressionStatus.locked, lockedAt };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /** Fetch progression by id, asserting it exists and is not terminal. */
  private async findActiveProgression(id: string) {
    const progression = await this.prisma.academicProgression.findUnique({
      where: { id },
    });

    if (!progression) {
      throw new NotFoundException(`Progression with id '${id}' not found.`);
    }

    if (progression.status === ProgressionStatus.locked) {
      throw new ConflictException(
        `Progression '${id}' is already locked and cannot be modified.`,
      );
    }

    if (progression.status === ProgressionStatus.cancelled) {
      throw new ConflictException(
        `Progression '${id}' has been cancelled and cannot be modified.`,
      );
    }

    return progression;
  }

  /**
   * Status ordering guard.
   * Ensures the user has completed a prior step before advancing.
   */
  private assertStatusAtLeast(
    current: ProgressionStatus,
    required: ProgressionStatus,
    id: string,
  ) {
    const order: ProgressionStatus[] = [
      ProgressionStatus.draft,
      ProgressionStatus.with_record_done,
      ProgressionStatus.semester_assigned,
      ProgressionStatus.sections_assigned,
      ProgressionStatus.final_preview,
      ProgressionStatus.locked,
    ];

    if (order.indexOf(current) < order.indexOf(required)) {
      throw new BadRequestException(
        `Progression '${id}' is at step '${current}' but requires at least '${required}' to proceed.`,
      );
    }
  }

  /**
   * Core calculation: for every active batch with students,
   * split students into "with record" vs "without record" groups
   * and compute their target semesters based on stored decisions.
   */
  private async computeBatchSummaries(
    academicSessionId: string,
    progression: {
      id: string;
      withRecordDecision: Prisma.JsonValue | null;
      withoutRecordDecision: Prisma.JsonValue | null;
    },
  ): Promise<{
    batches: BatchProgressionSummary[];
    withRecordStudentIds: Set<string>;
  }> {
    // Load all active students with their batch info and most recent academic record
    // Exclude records for the current session — a student who already has a record
    // for this session was enrolled by a prior progression and should not appear again.
    const students = await this.prisma.student.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        stdRegNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        batchId: true,
        batch: { select: { id: true, name: true, programDuration: true } },
        academicRecords: {
          where: { academicSessionId: { not: academicSessionId } },
          orderBy: { semesterNumber: 'desc' },
          take: 1,
          select: {
            semesterNumber: true,
            sectionId: true,
            section: { select: { name: true } },
          },
        },
      },
    });

    const withRecordDecision =
      progression.withRecordDecision as unknown as StoredWithRecordDecision | null;
    const withoutRecordDecision =
      progression.withoutRecordDecision as unknown as StoredWithoutRecordDecision | null;

    // Build adjustment lookup for manual overrides (studentId → toSemester)
    const manualAdjustmentMap = new Map<string, number>();
    if (
      withRecordDecision?.mode === WithRecordMode.MANUAL &&
      withRecordDecision.adjustments
    ) {
      for (const adj of withRecordDecision.adjustments) {
        manualAdjustmentMap.set(adj.studentId, adj.toSemester);
      }
    }

    // Group students by batch
    const batchMap = new Map<
      string,
      {
        batchId: string;
        batchName: string;
        programDuration: number;
        withRecord: typeof students;
        withoutRecord: typeof students;
      }
    >();

    const withRecordStudentIds = new Set<string>();

    for (const student of students) {
      const batchId = student.batchId;
      if (!batchMap.has(batchId)) {
        batchMap.set(batchId, {
          batchId,
          batchName: student.batch.name,
          programDuration: student.batch.programDuration,
          withRecord: [],
          withoutRecord: [],
        });
      }

      const group = batchMap.get(batchId)!;
      const hasRecord = student.academicRecords.length > 0;

      if (hasRecord) {
        group.withRecord.push(student);
        withRecordStudentIds.add(student.id);
      } else {
        group.withoutRecord.push(student);
      }
    }

    const batches: BatchProgressionSummary[] = [];

    for (const group of batchMap.values()) {
      // ── with-record students: compute target semester ────────────────────
      const withRecordStudents: StudentPreviewItem[] = group.withRecord.map(
        (s) => {
          const latestRecord = s.academicRecords[0];
          const currentSemester = latestRecord.semesterNumber;
          let targetSemester: number;

          if (
            withRecordDecision?.mode === WithRecordMode.MANUAL &&
            manualAdjustmentMap.has(s.id)
          ) {
            targetSemester = manualAdjustmentMap.get(s.id)!;
          } else {
            // Auto: increment by 1, cap at programDuration * 2 (semesters per year)
            targetSemester = Math.min(
              currentSemester + 1,
              group.programDuration * 2,
            );
          }

          return {
            studentId: s.id,
            regNumber: s.stdRegNumber,
            fullName: fullName(s.firstName, s.middleName, s.lastName),
            currentSemester,
            targetSemester,
            sectionId: latestRecord.sectionId,
            sectionName: latestRecord.section?.name ?? undefined,
          };
        },
      );

      // ── without-record students: resolve semester from decision ───────────
      const withoutRecordStudents: StudentPreviewItem[] =
        group.withoutRecord.map((s) => {
          let targetSemester = withoutRecordDecision?.defaultSemester ?? 1;

          // batch-level override
          const batchOverride = withoutRecordDecision?.batchOverrides?.find(
            (o) => o.batchId === group.batchId,
          );
          if (batchOverride) targetSemester = batchOverride.semester;

          // student-level override (highest priority)
          const studentOverride = withoutRecordDecision?.studentOverrides?.find(
            (o) => o.studentId === s.id,
          );
          if (studentOverride) targetSemester = studentOverride.semester;

          return {
            studentId: s.id,
            regNumber: s.stdRegNumber,
            fullName: fullName(s.firstName, s.middleName, s.lastName),
            currentSemester: null,
            targetSemester,
          };
        });

      batches.push({
        batchId: group.batchId,
        batchName: group.batchName,
        withRecordCount: withRecordStudents.length,
        withoutRecordCount: withoutRecordStudents.length,
        withRecordStudents,
        withoutRecordStudents,
      });
    }

    return { batches, withRecordStudentIds };
  }

  /**
   * Build section breakdown for the final preview based on sectionDecision.
   * This is purely in-memory — no DB writes.
   */
  private computeSectionBreakdown(
    batches: BatchProgressionSummary[],
    sectionDecision: StoredSectionDecision | null,
  ): BatchSectionBreakdown[] {
    if (!sectionDecision) return [];

    return batches
      .filter((b) => b.withoutRecordCount > 0)
      .map((batch) => {
        const students = batch.withoutRecordStudents.map((s) => ({
          studentId: s.studentId,
          regNumber: s.regNumber,
          fullName: s.fullName,
        }));

        let sections: SectionAssignment[];

        if (sectionDecision.strategy === SectionStrategy.SINGLE) {
          sections = [
            {
              sectionName: 'Default',
              students,
            },
          ];
        } else if (sectionDecision.strategy === SectionStrategy.SPLIT_50_50) {
          const half = Math.ceil(students.length / 2);
          sections = [
            { sectionName: 'A', students: students.slice(0, half) },
            { sectionName: 'B', students: students.slice(half) },
          ];
        } else {
          // CUSTOM — map from stored decision
          const split = sectionDecision.customSplits?.find(
            (cs) => cs.batchId === batch.batchId,
          );

          if (split) {
            let cursor = 0;
            sections = split.sections.map((slot, i) => {
              const chunk = students.slice(cursor, cursor + slot.studentCount);
              cursor += slot.studentCount;
              return {
                sectionId: slot.sectionId,
                sectionName: slot.name ?? `Section ${i + 1}`,
                students: chunk,
              };
            });
          } else {
            // Fallback if no custom split defined for this batch
            sections = [{ sectionName: 'Default', students }];
          }
        }

        return {
          batchId: batch.batchId,
          batchName: batch.batchName,
          strategy: sectionDecision.strategy,
          sections,
        };
      });
  }
}
