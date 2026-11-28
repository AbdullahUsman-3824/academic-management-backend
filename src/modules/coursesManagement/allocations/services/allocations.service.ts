import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
import {
  CreateAllocationDto,
  BulkAllocationDto,
  UpdateAllocationDto,
} from '../dto';
import { CourseAllocationStatus } from '../../../../generated/prisma/enums';
import {
  ACADEMIC_SESSION_STATUS,
  ALLOCATION_STATUS,
  COURSE_STATUS,
  ENROLLMENT_STATUS,
} from '../../../../common/constants/status.constants';
import { EnrollmentsService } from '../../enrollments/services/enrollments.service';

/**
 * #9 Workload guard: max ACTIVE course allocations one faculty may hold in a
 * single academic session. Configurable via env; defaults to 8. This is a
 * load cap, not a timetable clash check — true time-slot conflict detection
 * needs schedule data the model doesn't yet carry.
 */
const MAX_ALLOCATIONS_PER_FACULTY_PER_SESSION = Number(
  process.env.MAX_ALLOCATIONS_PER_FACULTY_PER_SESSION ?? 8,
);

type HistoricalCourse = {
  courseId: string;
  code: string;
  name: string;
  creditHours: number;
  isCompulsory: boolean;
  allocations: {
    id: string;
    status: CourseAllocationStatus;
    createdAt: Date;
    session: {
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
    };
    faculty: {
      id: string;
      name: string;
      employeeNumber: string;
    };
  }[];
};

@Injectable()
export class AllocationsService {
  private readonly logger = new Logger(AllocationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

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
    if (!semester) {
      throw new NotFoundException('Semester not found');
    }
    if (!section) {
      throw new NotFoundException('Section not found in the selected batch');
    }

    const assignments = await this.prisma.batchCourseAssignment.findMany({
      where: {
        batchId,
        semesterId: semester.id,
        course: { status: COURSE_STATUS.ACTIVE },
      },
      select: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            creditHours: true,
          },
        },
        allocations: {
          where: { academicSessionId: session.id, sectionId: section.id },
          select: {
            id: true,
            facultyId: true,
            status: true,
            createdAt: true,
            faculty: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
              },
            },
          },
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          take: 1,
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return {
      group: {
        batch: batch.name,
        semester: semester.number,
        section: section.name,
      },
      courses: assignments.map(({ course, allocations }) => {
        const allocation = allocations[0];
        return {
          courseId: course.id,
          code: course.code,
          name: course.name,
          creditHours: course.creditHours,
          allocation: allocation
            ? {
                id: allocation.id,
                facultyId: allocation.facultyId,
                facultyName: [
                  allocation.faculty.firstName,
                  allocation.faculty.middleName,
                  allocation.faculty.lastName,
                ]
                  .filter((name): name is string => Boolean(name))
                  .join(' '),
                status: allocation.status,
              }
            : null,
        };
      }),
    };
  }

  async getCurrentSessionGroups() {
    const session = await this.prisma.academicSession.findFirst({
      where: { status: ACADEMIC_SESSION_STATUS.ACTIVE },
      select: { id: true, name: true },
    });

    if (!session) {
      throw new NotFoundException('No active academic session found');
    }

    const batches = await this.prisma.batch.findMany({
      select: {
        id: true,
        name: true,
        currentSemester: { select: { number: true } },
        sections: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      session,
      groups: batches.map((batch) => ({
        batchId: batch.id,
        batchName: batch.name,
        semester: batch.currentSemester?.number ?? null,
        sections: batch.sections,
      })),
    };
  }

  async getFacultyOptions() {
    const session = await this.prisma.academicSession.findFirst({
      where: { status: ACADEMIC_SESSION_STATUS.ACTIVE },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });

    if (!session) {
      throw new NotFoundException('No active academic session found');
    }

    const faculties = await this.prisma.faculty.findMany({
      where: { status: 'active' },
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
      name: [faculty.firstName, faculty.middleName, faculty.lastName]
        .filter((name): name is string => Boolean(name))
        .join(' '),
      designation: faculty.designation,
      workload: faculty._count.courseAllocations,
    }));
  }

  async getCurrentSectionAllocations(sectionId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: {
        id: true,
        batch: {
          select: {
            id: true,
            currentSemesterId: true,
          },
        },
      },
    });

    if (!section) throw new NotFoundException('Section not found');
    if (!section.batch.currentSemesterId) {
      throw new BadRequestException('Batch has no current semester set');
    }

    const activeSession = await this.prisma.academicSession.findFirst({
      where: { status: ACADEMIC_SESSION_STATUS.ACTIVE },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });

    if (!activeSession) {
      throw new BadRequestException('No active academic session found');
    }

    return this.getCoursesForGroup(
      activeSession.id,
      section.batch.id,
      section.batch.currentSemesterId,
      section.id,
    );
  }

  async getSectionAllocationHistory(sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId },
      select: {
        id: true,
        name: true,
        batch: { select: { id: true, name: true } },
      },
    });

    if (!section) {
      throw new NotFoundException('Section not found in the selected batch');
    }

    const assignments = await this.prisma.batchCourseAssignment.findMany({
      where: {
        batchId: section.batch.id,
        course: { status: COURSE_STATUS.ACTIVE },
      },
      select: {
        isCompulsory: true,
        semester: { select: { number: true } },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            creditHours: true,
          },
        },
        allocations: {
          where: { sectionId: section.id },
          select: {
            id: true,
            status: true,
            createdAt: true,
            academicSession: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
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

    const bySemester = new Map<number, HistoricalCourse[]>();

    for (const assignment of assignments) {
      const semesterNumber = assignment.semester.number;
      const courses = bySemester.get(semesterNumber) ?? [];
      courses.push({
        courseId: assignment.course.id,
        code: assignment.course.code,
        name: assignment.course.name,
        creditHours: assignment.course.creditHours,
        isCompulsory: assignment.isCompulsory,
        allocations: assignment.allocations.map((allocation) => ({
          id: allocation.id,
          status: allocation.status,
          createdAt: allocation.createdAt,
          session: allocation.academicSession,
          faculty: {
            id: allocation.faculty.id,
            name: [
              allocation.faculty.firstName,
              allocation.faculty.middleName,
              allocation.faculty.lastName,
            ]
              .filter((name): name is string => Boolean(name))
              .join(' '),
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

  async create(dto: CreateAllocationDto, tx?: Prisma.TransactionClient) {
    const db = this.prisma;

    // Validate all foreign keys
    const [course, faculty, section] = await Promise.all([
      db.course.findUnique({ where: { id: dto.courseId } }),
      db.faculty.findUnique({ where: { id: dto.facultyId } }),
      db.section.findUnique({
        where: { id: dto.sectionId },
        include: { batch: true },
      }),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!faculty) throw new NotFoundException('Faculty not found');
    if (!section) throw new NotFoundException('Section not found');

    // Always use the active academic session
    const activeSession = await db.academicSession.findFirst({
      where: { status: ACADEMIC_SESSION_STATUS.ACTIVE },
      orderBy: { startDate: 'desc' },
    });
    if (!activeSession) {
      throw new BadRequestException(
        'No active academic session found. Please activate a session in Academic Management first.',
      );
    }
    const academicSessionId = activeSession.id;

    // Auto-detect semester from section's current academic records
    const sectionRecord = await db.studentAcademicRecord.findFirst({
      where: {
        sectionId: dto.sectionId,
        academicSessionId: activeSession.id,
      },
      include: { semester: { select: { number: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!sectionRecord) {
      throw new BadRequestException(
        `No academic records found for section ${section.name}. Please ensure students are enrolled in this section for the current session.`,
      );
    }

    const semesterNumber = sectionRecord.semester.number;

    // Validate course is assigned to this batch/semester
    const batchCourseAssignment = await db.batchCourseAssignment.findFirst({
      where: {
        batchId: section.batchId,
        courseId: dto.courseId,
        semester: { number: semesterNumber },
      },
    });

    if (!batchCourseAssignment) {
      throw new BadRequestException(
        `Course ${course.code} is not assigned to ${section.batch.name} for Semester ${semesterNumber}. Please assign the course to this batch first.`,
      );
    }

    // The transactional body, runnable either inside an existing tx or a new one.
    const run = async (client: Prisma.TransactionClient) => {
      // Check the workload in the same transaction as the allocation write.
      const activeLoad = await client.courseAllocation.count({
        where: {
          facultyId: dto.facultyId,
          academicSessionId,
          status: ALLOCATION_STATUS.ACTIVE,
        },
      });
      if (activeLoad >= MAX_ALLOCATIONS_PER_FACULTY_PER_SESSION) {
        throw new BadRequestException(
          `${faculty.firstName} ${faculty.lastName} already holds the maximum of ${MAX_ALLOCATIONS_PER_FACULTY_PER_SESSION} active course allocations for this session.`,
        );
      }

      // Create the allocation
      const allocation = await client.courseAllocation.create({
        data: {
          batchCourseAssignmentId: batchCourseAssignment.id,
          facultyId: dto.facultyId,
          sectionId: dto.sectionId,
          academicSessionId,
          status: ALLOCATION_STATUS.ACTIVE,
        },
        select: {
          id: true,
          facultyId: true,
          sectionId: true,
          academicSessionId: true,
          status: true,
        },
      });

      // Auto-enroll all students in this section/semester/session
      const studentRecords = await client.studentAcademicRecord.findMany({
        where: {
          sectionId: dto.sectionId,
          semesterId: batchCourseAssignment.semesterId,
          academicSessionId: academicSessionId,
          courseRegistrationFinalizedAt: null,
        },
        select: {
          id: true,
          student: {
            select: {
              stdRegNumber: true,
            },
          },
        },
      });

      let enrolledCount = 0;
      let skippedCount = 0;

      for (const record of studentRecords) {
        const { credits, maxCredits } =
          await this.enrollmentsService.getCurrentCreditLoad(client, record.id);
        if (maxCredits != null && credits + course.creditHours > maxCredits) {
          skippedCount++;
          this.logger.warn(
            `[AUTO-ENROLL] Skipped ${record.student.stdRegNumber}: ${course.code} would exceed the semester credit limit.`,
          );
          continue;
        }

        try {
          await client.courseEnrollment.create({
            data: {
              studentAcademicRecordId: record.id,
              allocationId: allocation.id,
              status: ENROLLMENT_STATUS.ENROLLED,
              isExtra: false,
            },
          });
          enrolledCount++;
        } catch (err: unknown) {
          const prismaError = err as { code?: string; message?: string };
          // Skip if already enrolled (P2002 = unique constraint)
          if (prismaError.code === 'P2002') {
            skippedCount++;
          } else {
            this.logger.error(
              `Failed to enroll student ${record.student.stdRegNumber}:`,
              prismaError.message ?? String(err),
            );
          }
        }
      }

      this.logger.log(
        `[ALLOCATION] Created allocation for ${course.code} in ${section.name}`,
      );
      this.logger.log(
        `[AUTO-ENROLL] Enrolled ${enrolledCount} students, skipped ${skippedCount}`,
      );

      return {
        id: allocation.id,
        courseId: dto.courseId,
        facultyId: allocation.facultyId,
        sectionId: allocation.sectionId,
        academicSessionId: allocation.academicSessionId,
        status: allocation.status,
      };
    };

    try {
      // When called from bulkCreate, reuse the caller's transaction (#8).
      if (tx) {
        return await run(tx);
      }
      return await this.prisma.$transaction(run, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (e: unknown) {
      const prismaError = e as { code?: string };
      if (prismaError.code === 'P2002') {
        throw new ConflictException(
          `${faculty.firstName} ${faculty.lastName} is already assigned to teach ${course.code} in this section`,
        );
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateAllocationDto) {
    const allocation = await this.prisma.courseAllocation.findUnique({
      where: { id },
      select: {
        id: true,
        facultyId: true,
        academicSessionId: true,
        status: true,
      },
    });

    if (!allocation) {
      throw new NotFoundException('Course allocation not found');
    }
    if (allocation.status !== ALLOCATION_STATUS.ACTIVE) {
      throw new BadRequestException(
        'Cannot change faculty for an inactive allocation',
      );
    }

    const faculty = await this.prisma.faculty.findUnique({
      where: { id: dto.facultyId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        employeeNumber: true,
        designation: true,
        status: true,
      },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty not found');
    }
    if (faculty.status !== 'active') {
      throw new BadRequestException('Selected faculty is inactive');
    }

    if (allocation.facultyId !== dto.facultyId) {
      const activeLoad = await this.prisma.courseAllocation.count({
        where: {
          facultyId: dto.facultyId,
          academicSessionId: allocation.academicSessionId,
          status: ALLOCATION_STATUS.ACTIVE,
        },
      });
      if (activeLoad >= MAX_ALLOCATIONS_PER_FACULTY_PER_SESSION) {
        throw new BadRequestException(
          `${faculty.firstName} ${faculty.lastName} already holds the maximum of ${MAX_ALLOCATIONS_PER_FACULTY_PER_SESSION} active course allocations for this session.`,
        );
      }
    }

    const updated = await this.prisma.courseAllocation.update({
      where: { id },
      data: { facultyId: dto.facultyId },
      select: {
        id: true,
        facultyId: true,
        status: true,
      },
    });

    return {
      id: updated.id,
      facultyId: updated.facultyId,
      status: updated.status,
    };
  }

  /**
   * Bulk create allocations (multiple courses for same teacher/section)
   */
  async bulkCreate(dto: BulkAllocationDto) {
    // All-or-nothing: the whole batch shares ONE transaction, so a single
    // failure rolls back every allocation created in this call (#8).
    return this.prisma.$transaction(
      async (tx) => {
        const results: Array<
          Awaited<ReturnType<AllocationsService['create']>>
        > = [];
        for (const courseId of dto.courseIds) {
          const allocation = await this.create(
            {
              facultyId: dto.facultyId,
              courseId,
              sectionId: dto.sectionId,
            },
            tx,
          );
          results.push(allocation);
        }

        return {
          success: results,
          errors: [],
          summary: {
            total: dto.courseIds.length,
            created: results.length,
            failed: 0,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Remove allocation (soft delete) and deactivate the enrollments it owned.
   */
  async remove(id: string) {
    const allocation = await this.prisma.courseAllocation.findUnique({
      where: { id },
      select: { sectionId: true, academicSessionId: true },
    });

    if (!allocation) {
      throw new NotFoundException('Course allocation not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.courseAllocation.update({
        where: { id },
        data: { status: ALLOCATION_STATUS.INACTIVE },
      });

      // Drop enrollments that were tied to this allocation, but only when no
      // OTHER active allocation still covers the same course/section/session
      // (prevents orphaned "enrolled but inactive" rows — #3).
      const affected = await tx.courseEnrollment.findMany({
        where: { allocationId: id, status: ENROLLMENT_STATUS.ENROLLED },
        select: {
          id: true,
          allocation: {
            select: { batchCourseAssignment: { select: { courseId: true } } },
          },
        },
      });

      for (const e of affected) {
        const courseId = e.allocation.batchCourseAssignment.courseId;
        const otherActive = await tx.courseAllocation.findFirst({
          where: {
            id: { not: id },
            status: ALLOCATION_STATUS.ACTIVE,
            batchCourseAssignment: { courseId },
            sectionId: allocation.sectionId,
            academicSessionId: allocation.academicSessionId,
          },
        });
        if (!otherActive) {
          await tx.courseEnrollment.update({
            where: { id: e.id },
            data: { status: ENROLLMENT_STATUS.DROPPED, droppedAt: new Date() },
          });
        }
      }

      return { id, message: 'Allocation removed successfully' };
    });
  }
}
