import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  Prisma,
  StudentAcademicRecordStatus,
} from '../../../../generated/prisma/client';
import {
  ACADEMIC_SESSION_STATUS,
  ALLOCATION_STATUS,
  BATCH_STATUS,
  COURSE_STATUS,
  ENROLLMENT_STATUS,
} from '../../../../common/constants/status.constants';
import {
  BulkAllocationDto,
  CreateAllocationDto,
  GetAllocationsQueryDto,
  UpdateAllocationDto,
} from '../dto';

type TransactionClient = Prisma.TransactionClient;

type EnrollmentSummary = {
  enrolled: number;
  reactivated: number;
  skippedAlreadyEnrolled: number;
  skippedCreditLimit: string[];
};

@Injectable()
export class AllocationsService {
  private readonly logger = new Logger(AllocationsService.name);
  private readonly maxAllocationsPerFaculty: number;
  private readonly facultyStatusActive = 'active';

  constructor(private readonly prisma: PrismaService) {
    const configured = process.env.MAX_ALLOCATIONS_PER_FACULTY_PER_SESSION;
    const parsed = configured === undefined ? Number.NaN : Number(configured);
    this.maxAllocationsPerFaculty =
      Number.isInteger(parsed) && parsed >= 1 ? parsed : 8;
    if (configured !== undefined &&
      !(Number.isInteger(parsed) && parsed >= 1)) {
      // Invalid configuration must not silently disable the workload safeguard.
      this.logger.warn(
        `Invalid MAX_ALLOCATIONS_PER_FACULTY_PER_SESSION="${configured}"; falling back to 8.`,
      );
    }
  }

  private async getActiveSessionOrThrow(client: TransactionClient | PrismaService) {
    const [session, activeCount] = await Promise.all([
      client.academicSession.findFirst({
        where: { status: ACADEMIC_SESSION_STATUS.ACTIVE },
        orderBy: { startDate: 'desc' },
        select: { id: true, name: true, startDate: true, endDate: true },
      }),
      client.academicSession.count({
        where: { status: ACADEMIC_SESSION_STATUS.ACTIVE },
      }),
    ]);
    if (!session) {
      throw new BadRequestException('No active academic session found');
    }
    if (activeCount > 1) {
      // This is a data-quality warning, not a hard failure; the newest session is deterministic.
      this.logger.warn(
        `More than one active academic session exists; using ${session.name}.`,
      );
    }
    return session;
  }

  private buildFullName(
    firstName: string,
    middleName: string | null | undefined,
    lastName: string | null | undefined,
  ) {
    return [firstName, middleName, lastName]
      .filter((name): name is string => Boolean(name))
      .join(' ');
  }

  private async lockFaculty(
    tx: TransactionClient,
    facultyId: string,
  ): Promise<void> {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${facultyId}))
    `;
  }

  private getTransactionOptions() {
    return {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 5000,
      timeout: 30000,
    };
  }

  async getCoursesForGroup(
    sessionId: string,
    batchId: string,
    semesterId: string,
    sectionId: string,
  ) {
    const [session, batch, semester, section] = await Promise.all([
      this.prisma.academicSession.findUnique({
        where: { id: sessionId },
        select: { id: true },
      }),
      this.prisma.batch.findUnique({
        where: { id: batchId },
        select: { id: true, name: true },
      }),
      this.prisma.semester.findUnique({
        where: { id: semesterId },
        select: { id: true, number: true },
      }),
      this.prisma.section.findFirst({
        where: { id: sectionId, batchId },
        select: { id: true, name: true },
      }),
    ]);
    if (!session) throw new NotFoundException('Academic session not found');
    if (!batch) throw new NotFoundException('Batch not found');
    if (!semester) throw new NotFoundException('Semester not found');
    if (!section) throw new NotFoundException('Section not found in the selected batch');

    const assignments = await this.prisma.batchCourseAssignment.findMany({
      where: {
        batchId,
        semesterId: semester.id,
        course: { status: COURSE_STATUS.ACTIVE },
      },
      select: {
        id: true,
        isCompulsory: true,
        course: {
          select: { id: true, code: true, name: true, creditHours: true },
        },
        allocations: {
          where: {
            academicSessionId: session.id,
            sectionId: section.id,
            status: ALLOCATION_STATUS.ACTIVE,
            type: 'REGULAR',
          },
          select: {
            id: true,
            facultyId: true,
            status: true,
            faculty: {
              select: { firstName: true, middleName: true, lastName: true },
            },
          },
          take: 1,
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return {
      group: { batch: batch.name, semester: semester.number, section: section.name },
      courses: assignments.map((assignment) => {
        const allocation = assignment.allocations[0];
        return {
          batchCourseAssignmentId: assignment.id,
          isCompulsory: assignment.isCompulsory,
          courseId: assignment.course.id,
          code: assignment.course.code,
          name: assignment.course.name,
          creditHours: assignment.course.creditHours,
          allocation: allocation
            ? {
                id: allocation.id,
                facultyId: allocation.facultyId,
                facultyName: this.buildFullName(
                  allocation.faculty.firstName,
                  allocation.faculty.middleName,
                  allocation.faculty.lastName,
                ),
                status: allocation.status,
              }
            : null,
        };
      }),
    };
  }

  async getCurrentSessionGroups() {
    const session = await this.getActiveSessionOrThrow(this.prisma);
    const batches = await this.prisma.batch.findMany({
      where: {
        status: BATCH_STATUS.ACTIVE,
        currentSemesterId: { not: null },
      },
      select: {
        id: true,
        name: true,
        currentSemesterId: true,
        currentSemester: { select: { number: true } },
        sections: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
    return {
      session: { id: session.id, name: session.name },
      groups: batches.map((batch) => ({
        batchId: batch.id,
        batchName: batch.name,
        semester: batch.currentSemester?.number ?? null,
        canAllocate: batch.currentSemesterId !== null,
        sections: batch.sections,
      })),
    };
  }

  async getFacultyOptions() {
    const session = await this.getActiveSessionOrThrow(this.prisma);
    const faculties = await this.prisma.faculty.findMany({
      where: { status: this.facultyStatusActive },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        designation: true,
        _count: {
          select: {
            courseAllocations: {
              where: {
                academicSessionId: session.id,
                status: ALLOCATION_STATUS.ACTIVE,
                type: 'REGULAR',
              },
            },
          },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return faculties.map((faculty) => ({
      id: faculty.id,
      employeeNumber: faculty.employeeNumber,
      name: this.buildFullName(
        faculty.firstName,
        faculty.middleName,
        faculty.lastName,
      ),
      designation: faculty.designation,
      workload: faculty._count.courseAllocations,
      maxWorkload: this.maxAllocationsPerFaculty,
      atCapacity: faculty._count.courseAllocations >= this.maxAllocationsPerFaculty,
    }));
  }

  async getCurrentSectionAllocations(sectionId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: {
        id: true,
        batch: { select: { id: true, currentSemesterId: true } },
      },
    });
    if (!section) throw new NotFoundException('Section not found');
    if (!section.batch.currentSemesterId) {
      throw new BadRequestException('Batch has no current semester set');
    }
    const session = await this.getActiveSessionOrThrow(this.prisma);
    return this.getCoursesForGroup(
      session.id,
      section.batch.id,
      section.batch.currentSemesterId,
      section.id,
    );
  }

  async getSectionAllocationHistory(sectionId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: {
        id: true,
        name: true,
        batch: { select: { id: true, name: true } },
      },
    });
    if (!section) throw new NotFoundException('Section not found');

    const assignments = await this.prisma.batchCourseAssignment.findMany({
      where: { batchId: section.batch.id },
      select: {
        id: true,
        isCompulsory: true,
        semester: { select: { number: true } },
        course: {
          select: { id: true, code: true, name: true, creditHours: true, status: true },
        },
        allocations: {
          where: { sectionId: section.id, type: 'REGULAR' },
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
            academicSession: {
              select: { id: true, name: true, startDate: true, endDate: true },
            },
            faculty: {
              select: {
                id: true,
                firstName: true,
                middleName: true,
                lastName: true,
                employeeNumber: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ semester: { number: 'asc' } }, { displayOrder: 'asc' }],
    });

    const bySemester = new Map<number, any[]>();
    for (const assignment of assignments) {
      const semesterNumber = assignment.semester.number;
      const courses = bySemester.get(semesterNumber) ?? [];
      courses.push({
        batchCourseAssignmentId: assignment.id,
        courseId: assignment.course.id,
        code: assignment.course.code,
        name: assignment.course.name,
        creditHours: assignment.course.creditHours,
        courseStatus: assignment.course.status,
        isCompulsory: assignment.isCompulsory,
        allocations: assignment.allocations.map((allocation) => ({
          id: allocation.id,
          type: allocation.type,
          status: allocation.status,
          createdAt: allocation.createdAt,
          session: allocation.academicSession,
          faculty: {
            id: allocation.faculty.id,
            name: this.buildFullName(
              allocation.faculty.firstName,
              allocation.faculty.middleName,
              allocation.faculty.lastName,
            ),
            employeeNumber: allocation.faculty.employeeNumber,
          },
        })),
      });
      bySemester.set(semesterNumber, courses);
    }

    return {
      batch: section.batch.name,
      section: section.name,
      history: Array.from(bySemester, ([semester, courses]) => ({
        semester,
        courses,
      })),
    };
  }

  private async syncEnrollmentsForAllocation(
    tx: TransactionClient,
    allocation: { id: string; updatedAt: Date | null },
    assignment: {
      semesterId: string;
      semester: { maxCredits: number | null };
      course: { creditHours: number };
    },
    sessionId: string,
    sectionId: string,
    creditLoad: Map<string, number>,
    allocationPreviousUpdatedAt?: Date | null,
  ): Promise<EnrollmentSummary> {
    const eligibleRecords = await tx.studentAcademicRecord.findMany({
      where: {
        sectionId,
        semesterId: assignment.semesterId,
        academicSessionId: sessionId,
        courseRegistrationFinalizedAt: null,
        status: {
          notIn: [
            StudentAcademicRecordStatus.SUSPENDED,
            StudentAcademicRecordStatus.DROPPED_OUT,
            StudentAcademicRecordStatus.GRADUATED,
          ],
        },
      },
      select: {
        id: true,
        student: { select: { stdRegNumber: true } },
      },
    });
    if (eligibleRecords.length === 0) {
      return {
        enrolled: 0,
        reactivated: 0,
        skippedAlreadyEnrolled: 0,
        skippedCreditLimit: [],
      };
    }

    const recordIds = eligibleRecords.map((record) => record.id);
    const [existing, loads] = await Promise.all([
      tx.courseEnrollment.findMany({
        where: {
          allocationId: allocation.id,
          studentAcademicRecordId: { in: recordIds },
        },
        select: {
          studentAcademicRecordId: true,
          status: true,
          droppedAt: true,
        },
      }),
      // Mirrors getCurrentCreditLoad: count every non-dropped enrollment and
      // sum the allocation course's credit hours for all eligible records once.
      tx.courseEnrollment.findMany({
        where: {
          studentAcademicRecordId: { in: recordIds },
          status: { not: ENROLLMENT_STATUS.DROPPED },
        },
        select: {
          studentAcademicRecordId: true,
          allocation: {
            select: {
              batchCourseAssignment: {
                select: { course: { select: { creditHours: true } } },
              },
            },
          },
        },
      }),
    ]);

    for (const load of loads) {
      const current = creditLoad.get(load.studentAcademicRecordId) ?? 0;
      creditLoad.set(
        load.studentAcademicRecordId,
        current + (load.allocation.batchCourseAssignment.course.creditHours || 0),
      );
    }
    for (const record of eligibleRecords) {
      if (!creditLoad.has(record.id)) creditLoad.set(record.id, 0);
    }

    const existingByRecord = new Map(
      existing.map((row) => [row.studentAcademicRecordId, row]),
    );
    let skippedAlreadyEnrolled = 0;
    let enrolled = 0;
    let reactivated = 0;
    const skippedCreditLimit: string[] = [];
    const missingIds: string[] = [];
    const rowsToReactivate: Array<{ studentAcademicRecordId: string }> = [];

    for (const record of eligibleRecords) {
      const existingRow = existingByRecord.get(record.id);
      if (existingRow) {
        if (existingRow.status !== ENROLLMENT_STATUS.DROPPED) {
          skippedAlreadyEnrolled++;
          continue;
        }
        if (
          existingRow.droppedAt &&
          allocationPreviousUpdatedAt
        ) {
          const difference = Math.abs(
            existingRow.droppedAt.getTime() -
              allocationPreviousUpdatedAt.getTime(),
          );
          // Reactivation only reverses an allocation removal, not a student's own drop.
          if (difference <= 60_000) {
            rowsToReactivate.push({
              studentAcademicRecordId: record.id,
            });
          }
        }
        continue;
      }
      missingIds.push(record.id);
    }

    if (rowsToReactivate.length > 0) {
      await tx.courseEnrollment.updateMany({
        where: {
          allocationId: allocation.id,
          studentAcademicRecordId: { in: rowsToReactivate.map((row) => row.studentAcademicRecordId) },
          status: ENROLLMENT_STATUS.DROPPED,
        },
        data: {
          status: ENROLLMENT_STATUS.ENROLLED,
          droppedAt: null,
        },
      });
      reactivated = rowsToReactivate.length;
      for (const row of rowsToReactivate) {
        creditLoad.set(
          row.studentAcademicRecordId,
          (creditLoad.get(row.studentAcademicRecordId) ?? 0) +
            assignment.course.creditHours,
        );
      }
    }

    const createRows: Array<{
      studentAcademicRecordId: string;
      allocationId: string;
      status: typeof ENROLLMENT_STATUS.ENROLLED;
      isExtra: false;
    }> = [];
    for (const recordId of missingIds) {
      const record = eligibleRecords.find((item) => item.id === recordId)!;
      const currentCredits = creditLoad.get(recordId) ?? 0;
      if (
        assignment.semester.maxCredits !== null &&
        currentCredits + assignment.course.creditHours >
          assignment.semester.maxCredits
      ) {
        skippedCreditLimit.push(record.student.stdRegNumber);
        continue;
      }
      createRows.push({
        studentAcademicRecordId: recordId,
        allocationId: allocation.id,
        status: ENROLLMENT_STATUS.ENROLLED,
        isExtra: false,
      });
      creditLoad.set(recordId, currentCredits + assignment.course.creditHours);
    }
    if (createRows.length > 0) {
      await tx.courseEnrollment.createMany({
        data: createRows,
        skipDuplicates: true,
      });
      enrolled = createRows.length;
    }

    return {
      enrolled,
      reactivated,
      skippedAlreadyEnrolled,
      skippedCreditLimit,
    };
  }

  private async createWithinTx(
    tx: TransactionClient,
    context: {
      session: { id: string };
      section: {
        id: string;
        name: string;
        batch: {
          id: string;
          name: string;
          status: string;
          currentSemesterId: string | null;
        };
      };
      faculty: {
        id: string;
        firstName: string;
        middleName: string | null;
        lastName: string | null;
        status: string;
      };
      creditLoad: Map<string, number>;
    },
    assignment: {
      id: string;
      batchId: string;
      semesterId: string;
      course: { id: string; code: string; status: string; creditHours: number };
      semester: { id: string; number: number; maxCredits: number | null };
    },
  ) {
    if (assignment.batchId !== context.section.batch.id) {
      throw new BadRequestException(
        `Assignment ${assignment.id} does not belong to batch ${context.section.batch.name}.`,
      );
    }
    if (assignment.course.status !== COURSE_STATUS.ACTIVE) {
      throw new BadRequestException(`Course ${assignment.course.code} is inactive.`);
    }
    if (context.faculty.status !== this.facultyStatusActive) {
      throw new BadRequestException(
        `Faculty ${this.buildFullName(context.faculty.firstName, context.faculty.middleName, context.faculty.lastName)} is inactive.`,
      );
    }
    if (context.section.batch.status !== BATCH_STATUS.ACTIVE) {
      throw new BadRequestException(`Batch ${context.section.batch.name} is not active.`);
    }
    if (
      !context.section.batch.currentSemesterId ||
      context.section.batch.currentSemesterId !== assignment.semesterId
    ) {
      throw new BadRequestException(
        `Course ${assignment.course.code} belongs to a semester that is not the batch's current semester.`,
      );
    }

    await this.lockFaculty(tx, context.faculty.id);
    const activeLoad = await tx.courseAllocation.count({
      where: {
        facultyId: context.faculty.id,
        academicSessionId: context.session.id,
        status: ALLOCATION_STATUS.ACTIVE,
        type: 'REGULAR',
      },
    });
    if (activeLoad >= this.maxAllocationsPerFaculty) {
      throw new BadRequestException(
        `${this.buildFullName(context.faculty.firstName, context.faculty.middleName, context.faculty.lastName)} already holds the maximum of ${this.maxAllocationsPerFaculty} active course allocations for this session.`,
      );
    }

    const existing = await tx.courseAllocation.findUnique({
      where: {
        batchCourseAssignmentId_sectionId_academicSessionId_type: {
          batchCourseAssignmentId: assignment.id,
          sectionId: context.section.id,
          academicSessionId: context.session.id,
          type: 'REGULAR',
        },
      },
      select: { id: true, status: true, facultyId: true, updatedAt: true },
    });
    if (existing?.status === ALLOCATION_STATUS.ACTIVE) {
      throw new ConflictException(
        `This course already has a teacher in this section for the current session.`,
      );
    }

    let allocation: {
      id: string;
      updatedAt: Date | null;
      status: string;
    };
    let reactivated = false;
    if (existing) {
      const previousUpdatedAt = existing.updatedAt;
      allocation = await tx.courseAllocation.update({
        where: { id: existing.id },
        data: {
          status: ALLOCATION_STATUS.ACTIVE,
          facultyId: context.faculty.id,
        },
        select: { id: true, updatedAt: true, status: true },
      });
      reactivated = true;
      allocation.updatedAt = previousUpdatedAt;
    } else {
      try {
        allocation = await tx.courseAllocation.create({
          data: {
            batchCourseAssignmentId: assignment.id,
            facultyId: context.faculty.id,
            sectionId: context.section.id,
            academicSessionId: context.session.id,
            type: 'REGULAR',
            status: ALLOCATION_STATUS.ACTIVE,
          },
          select: { id: true, updatedAt: true, status: true },
        });
      } catch (error: unknown) {
        const prismaError = error as { code?: string };
        if (prismaError.code === 'P2002') {
          throw new ConflictException(
            `This course already has a teacher in this section for the current session.`,
          );
        }
        throw error;
      }
    }

    const enrollment = await this.syncEnrollmentsForAllocation(
      tx,
      allocation,
      assignment,
      context.session.id,
      context.section.id,
      context.creditLoad,
      reactivated ? allocation.updatedAt : null,
    );

    return {
      id: allocation.id,
      batchCourseAssignmentId: assignment.id,
      courseId: assignment.course.id,
      courseCode: assignment.course.code,
      facultyId: context.faculty.id,
      sectionId: context.section.id,
      academicSessionId: context.session.id,
      status: allocation.status,
      reactivated,
      enrollment,
    };
  }

  async create(dto: CreateAllocationDto, tx?: TransactionClient) {
    const assignment = await (tx ?? this.prisma).batchCourseAssignment.findUnique({
      where: { id: dto.batchCourseAssignmentId },
      select: {
        id: true,
        batchId: true,
        semesterId: true,
        course: {
          select: { id: true, code: true, status: true, creditHours: true },
        },
        semester: { select: { id: true, number: true, maxCredits: true } },
      },
    });
    if (!assignment) throw new NotFoundException('Batch course assignment not found');

    const [section, faculty] = await Promise.all([
      (tx ?? this.prisma).section.findUnique({
        where: { id: dto.sectionId },
        select: {
          id: true,
          name: true,
          batch: {
            select: {
              id: true,
              name: true,
              status: true,
              currentSemesterId: true,
            },
          },
        },
      }),
      (tx ?? this.prisma).faculty.findUnique({
        where: { id: dto.facultyId },
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          status: true,
        },
      }),
    ]);
    if (!section) throw new NotFoundException('Section not found');
    if (!faculty) throw new NotFoundException('Faculty not found');

    const run = async (client: TransactionClient) => {
      const session = await this.getActiveSessionOrThrow(client);
      return this.createWithinTx(
        client,
        {
          session,
          section,
          faculty,
          creditLoad: new Map<string, number>(),
        },
        assignment,
      );
    };
    if (tx) return run(tx);
    return this.prisma.$transaction(run, this.getTransactionOptions());
  }

  async bulkCreate(dto: BulkAllocationDto) {
    return this.prisma.$transaction(async (tx) => {
      const [session, section, faculty, assignments] = await Promise.all([
        this.getActiveSessionOrThrow(tx),
        tx.section.findUnique({
          where: { id: dto.sectionId },
          select: {
            id: true,
            name: true,
            batch: {
              select: {
                id: true,
                name: true,
                status: true,
                currentSemesterId: true,
              },
            },
          },
        }),
        tx.faculty.findUnique({
          where: { id: dto.facultyId },
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            status: true,
          },
        }),
        tx.batchCourseAssignment.findMany({
          where: { id: { in: dto.assignmentIds } },
          select: {
            id: true,
            batchId: true,
            semesterId: true,
            course: {
              select: { id: true, code: true, status: true, creditHours: true },
            },
            semester: { select: { id: true, number: true, maxCredits: true } },
          },
        }),
      ]);
      if (!section) throw new NotFoundException('Section not found');
      if (!faculty) throw new NotFoundException('Faculty not found');

      const foundIds = new Set(assignments.map((assignment) => assignment.id));
      const missingIds = dto.assignmentIds.filter((id) => !foundIds.has(id));
      if (missingIds.length > 0) {
        throw new NotFoundException(
          `Batch course assignments not found: ${missingIds.join(', ')}`,
        );
      }

      const activeLoad = await tx.courseAllocation.count({
        where: {
          facultyId: dto.facultyId,
          academicSessionId: session.id,
          status: ALLOCATION_STATUS.ACTIVE,
          type: 'REGULAR',
        },
      });
      const existing = await tx.courseAllocation.findMany({
        where: {
          batchCourseAssignmentId: { in: dto.assignmentIds },
          sectionId: dto.sectionId,
          academicSessionId: session.id,
          type: 'REGULAR',
        },
        select: { batchCourseAssignmentId: true, status: true },
      });
      // Count inactive rows directly; active duplicates are still rejected by createWithinTx.
      const reactivateCount = existing.filter(
        (row) => row.status === ALLOCATION_STATUS.INACTIVE,
      ).length;
      const createCount =
        dto.assignmentIds.length -
        existing.filter(
          (row) =>
            row.status === ALLOCATION_STATUS.ACTIVE ||
            row.status === ALLOCATION_STATUS.INACTIVE,
        ).length;
      if (
        activeLoad + reactivateCount + createCount >
        this.maxAllocationsPerFaculty
      ) {
        throw new BadRequestException(
          `Bulk allocation exceeds the faculty workload cap of ${this.maxAllocationsPerFaculty}.`,
        );
      }

      const creditLoad = new Map<string, number>();
      const allocations: Awaited<
        ReturnType<AllocationsService['createWithinTx']>
      >[] = [];
      for (const assignment of assignments) {
        try {
          allocations.push(
            await this.createWithinTx(
              tx,
              { session, section, faculty, creditLoad },
              assignment,
            ),
          );
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : 'Allocation failed';
          throw new BadRequestException(
            `Failed to allocate course ${assignment.course.code}: ${message}`,
          );
        }
      }

      const created = allocations.filter((allocation) => !allocation.reactivated).length;
      const reactivated = allocations.filter((allocation) => allocation.reactivated).length;
      return {
        allocations,
        summary: {
          total: allocations.length,
          created,
          reactivated,
          enrolledTotal: allocations.reduce(
            (sum, allocation) => sum + allocation.enrollment.enrolled,
            0,
          ),
          skippedCreditLimitTotal: allocations.reduce(
            (sum, allocation) =>
              sum + allocation.enrollment.skippedCreditLimit.length,
            0,
          ),
        },
      };
    }, this.getTransactionOptions());
  }

  async update(id: string, dto: UpdateAllocationDto) {
    return this.prisma.$transaction(async (tx) => {
      const allocation = await tx.courseAllocation.findUnique({
        where: { id },
        select: {
          id: true,
          facultyId: true,
          batchCourseAssignmentId: true,
          academicSessionId: true,
          status: true,
          batchCourseAssignment: {
            select: { course: { select: { code: true } } },
          },
        },
      });
      if (!allocation) throw new NotFoundException('Course allocation not found');
      if (allocation.status !== ALLOCATION_STATUS.ACTIVE) {
        throw new BadRequestException('Cannot change faculty for an inactive allocation');
      }
      const session = await this.getActiveSessionOrThrow(tx);
      if (allocation.academicSessionId !== session.id) {
        throw new BadRequestException('Cannot edit an allocation from a past session');
      }

      const faculty = await tx.faculty.findUnique({
        where: { id: dto.facultyId },
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          status: true,
        },
      });
      if (!faculty) throw new NotFoundException('Faculty not found');
      if (faculty.status !== this.facultyStatusActive) {
        throw new BadRequestException('Selected faculty is inactive');
      }
      if (allocation.facultyId === dto.facultyId) {
        return {
          id: allocation.id,
          batchCourseAssignmentId: allocation.batchCourseAssignmentId,
          courseCode: allocation.batchCourseAssignment.course.code,
          facultyId: allocation.facultyId,
          facultyName: this.buildFullName(
            faculty.firstName,
            faculty.middleName,
            faculty.lastName,
          ),
          status: allocation.status,
        };
      }

      await this.lockFaculty(tx, dto.facultyId);
      const activeLoad = await tx.courseAllocation.count({
        where: {
          facultyId: dto.facultyId,
          academicSessionId: session.id,
          status: ALLOCATION_STATUS.ACTIVE,
          type: 'REGULAR',
        },
      });
      if (activeLoad >= this.maxAllocationsPerFaculty) {
        throw new BadRequestException(
          `${this.buildFullName(faculty.firstName, faculty.middleName, faculty.lastName)} already holds the maximum of ${this.maxAllocationsPerFaculty} active course allocations for this session.`,
        );
      }
      const updated = await tx.courseAllocation.update({
        where: { id },
        data: { facultyId: dto.facultyId },
        select: {
          id: true,
          batchCourseAssignmentId: true,
          facultyId: true,
          status: true,
        },
      });
      return {
        id: updated.id,
        batchCourseAssignmentId: updated.batchCourseAssignmentId,
        courseCode: allocation.batchCourseAssignment.course.code,
        facultyId: updated.facultyId,
        facultyName: this.buildFullName(
          faculty.firstName,
          faculty.middleName,
          faculty.lastName,
        ),
        status: updated.status,
      };
    }, this.getTransactionOptions());
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const allocation = await tx.courseAllocation.findUnique({
        where: { id },
        select: {
          id: true,
          batchCourseAssignmentId: true,
          sectionId: true,
          academicSessionId: true,
          status: true,
        },
      });
      if (!allocation) throw new NotFoundException('Course allocation not found');
      if (allocation.status !== ALLOCATION_STATUS.ACTIVE) {
        throw new BadRequestException('Allocation is already inactive');
      }
      const session = await this.getActiveSessionOrThrow(tx);
      if (allocation.academicSessionId !== session.id) {
        throw new BadRequestException(
          'Cannot remove an allocation from a past academic session',
        );
      }

      const [assessmentCount, markCount, resultCount] = await Promise.all([
        tx.assessment.count({
          where: { courseAllocationId: id },
        }),
        tx.studentMark.count({
          where: { courseEnrollment: { allocationId: id } },
        }),
        tx.studentCourseResult.count({
          where: { courseEnrollment: { allocationId: id } },
        }),
      ]);
      if (assessmentCount > 0 || markCount > 0 || resultCount > 0) {
        throw new BadRequestException(
          `Cannot remove allocation: ${assessmentCount} assessment(s), ${markCount} student mark(s), and ${resultCount} course result(s) exist.`,
        );
      }

      await tx.courseAllocation.update({
        where: { id },
        data: { status: ALLOCATION_STATUS.INACTIVE },
      });
      const otherActive = await tx.courseAllocation.findFirst({
        where: {
          id: { not: id },
          batchCourseAssignmentId: allocation.batchCourseAssignmentId,
          sectionId: allocation.sectionId,
          academicSessionId: allocation.academicSessionId,
          status: ALLOCATION_STATUS.ACTIVE,
          type: 'REGULAR',
        },
        select: { id: true },
      });
      let droppedEnrollments = 0;
      if (!otherActive) {
        const dropped = await tx.courseEnrollment.updateMany({
          where: {
            allocationId: id,
            status: ENROLLMENT_STATUS.ENROLLED,
          },
          data: {
            status: ENROLLMENT_STATUS.DROPPED,
            droppedAt: new Date(),
          },
        });
        droppedEnrollments = dropped.count;
      }
      return {
        id,
        message: 'Allocation removed successfully',
        droppedEnrollments,
      };
    }, this.getTransactionOptions());
  }

  async findAll(filters: GetAllocationsQueryDto) {
    let sessionId = filters.sessionId;
    if (!sessionId) {
      sessionId = (await this.getActiveSessionOrThrow(this.prisma)).id;
    }
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.CourseAllocationWhereInput = {
      academicSessionId: sessionId,
      type: 'REGULAR',
      ...(filters.facultyId && { facultyId: filters.facultyId }),
      ...(filters.sectionId && { sectionId: filters.sectionId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.batchId && {
        batchCourseAssignment: { batchId: filters.batchId },
      }),
    };
    const [total, allocations] = await Promise.all([
      this.prisma.courseAllocation.count({ where }),
      this.prisma.courseAllocation.findMany({
        where,
        include: {
          batchCourseAssignment: {
            include: { course: true },
          },
          faculty: true,
          section: { include: { batch: true } },
          academicSession: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      data: allocations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const allocation = await this.prisma.courseAllocation.findUnique({
      where: { id },
      include: {
        batchCourseAssignment: {
          include: { course: true, semester: true },
        },
        faculty: true,
        section: { include: { batch: true } },
        academicSession: true,
      },
    });
    if (!allocation) throw new NotFoundException('Course allocation not found');
    if (allocation.type !== 'REGULAR') {
      throw new NotFoundException('Course allocation not found');
    }
    const enrollments = await this.prisma.courseEnrollment.groupBy({
      by: ['status'],
      where: { allocationId: id },
      _count: { _all: true },
    });
    return {
      ...allocation,
      enrollmentCounts: enrollments.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
    };
  }

}
