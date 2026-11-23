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
  GetAllocationsQueryDto,
} from '../dto';
import {
  ACADEMIC_SESSION_STATUS,
  ALLOCATION_STATUS,
  ENROLLMENT_STATUS,
} from '../../../../common/constants/status.constants';

/**
 * #9 Workload guard: max ACTIVE course allocations one faculty may hold in a
 * single academic session. Configurable via env; defaults to 8. This is a
 * load cap, not a timetable clash check — true time-slot conflict detection
 * needs schedule data the model doesn't yet carry.
 */
const MAX_ALLOCATIONS_PER_FACULTY_PER_SESSION = Number(
  process.env.MAX_ALLOCATIONS_PER_FACULTY_PER_SESSION ?? 8,
);

@Injectable()
export class AllocationsService {
  private readonly logger = new Logger(AllocationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a single course allocation
   */
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

    // #9 Workload guard: cap active allocations per faculty per session.
    const activeLoad = await db.courseAllocation.count({
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
    const batchCourseAssignment =
      await db.batchCourseAssignment.findFirst({
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
      // Create the allocation
      const allocation = await client.courseAllocation.create({
        data: {
          batchCourseAssignmentId: batchCourseAssignment.id,
          facultyId: dto.facultyId,
          sectionId: dto.sectionId,
          academicSessionId,
          status: ALLOCATION_STATUS.ACTIVE,
        },
        include: {
          batchCourseAssignment: {
            select: {
              id: true,
              course: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  creditHours: true,
                },
              },
            },
          },
          faculty: {
            select: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
              employeeNumber: true,
              designation: true,
            },
          },
          section: {
            select: {
              id: true,
              name: true,
              batch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          academicSession: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Auto-enroll all students in this section/semester/session
      const studentRecords = await client.studentAcademicRecord.findMany({
        where: {
          sectionId: dto.sectionId,
          semesterId: batchCourseAssignment.semesterId,
          academicSessionId: academicSessionId,
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

      return allocation;
    };

    try {
      // When called from bulkCreate, reuse the caller's transaction (#8).
      if (tx) {
        return await run(tx);
      }
      return await this.prisma.$transaction(run);
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

  /**
   * Get courses assigned to a specific batch/semester/section
   * Used by frontend to show only valid courses when creating allocations
   */
  async getAssignedCourses(
    batchId: string,
    semesterNumber: number,
    _sectionId?: string,
  ) {
    // Courses are defined per batch + semester and shared across all sections,
    // so there is no per-section filtering anymore.
    const whereClause: Prisma.BatchCourseAssignmentWhereInput = {
      batchId,
      semester: { number: semesterNumber },
    };

    const assignments = await this.prisma.batchCourseAssignment.findMany({
      where: whereClause,
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            creditHours: true,
            status: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Only return active courses and remove duplicates
    const uniqueCourses = new Map<
      string,
      { id: string; code: string; name: string; creditHours: number; status: string }
    >();
    assignments
      .filter((a) => a.course.status === 'active')
      .forEach((a) => {
        if (!uniqueCourses.has(a.course.id)) {
          uniqueCourses.set(a.course.id, a.course);
        }
      });

    return Array.from(uniqueCourses.values());
  }

  /**
   * Bulk create allocations (multiple courses for same teacher/section)
   */
  async bulkCreate(dto: BulkAllocationDto) {
    // All-or-nothing: the whole batch shares ONE transaction, so a single
    // failure rolls back every allocation created in this call (#8).
    return this.prisma.$transaction(async (tx) => {
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
    });
  }

  /**
   * Get allocations with various filters
   * Always filters by active academic session
   * Returns paginated results
   */
  async findAll(query: GetAllocationsQueryDto = {}) {
    // Resolve the session scope (#14):
    //  - allSessions  -> no session filter (historical view)
    //  - academicSessionId -> that specific session
    //  - otherwise    -> default to the active session (backward compatible)
    let sessionFilter: string | undefined;
    if (!query.allSessions) {
      if (query.academicSessionId) {
        sessionFilter = query.academicSessionId;
      } else {
        const activeSession = await this.prisma.academicSession.findFirst({
          where: { status: ACADEMIC_SESSION_STATUS.ACTIVE },
          orderBy: { startDate: 'desc' },
        });
        sessionFilter = activeSession?.id;
      }
    }

    const where: Prisma.CourseAllocationWhereInput = {
      status: query.status || ALLOCATION_STATUS.ACTIVE,
    };
    if (sessionFilter) where.academicSessionId = sessionFilter;

    if (query.facultyId) where.facultyId = query.facultyId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.semesterNumber) {
      const semester = await this.prisma.semester.findUnique({
        where: { number: query.semesterNumber },
      });
      if (semester) where.batchCourseAssignment = { semesterId: semester.id };
    }

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.prisma.courseAllocation.count({ where });

    // Get paginated data
    const data = await this.prisma.courseAllocation.findMany({
      where,
      include: {
        batchCourseAssignment: { include: { course: true, semester: true } },
        faculty: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            employeeNumber: true,
            designation: true,
          },
        },
        section: {
          select: {
            id: true,
            name: true,
            batch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        academicSession: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { batchCourseAssignment: { semester: { number: 'asc' } } },
        { section: { name: 'asc' } },
      ],
      skip,
      take: limit,
    });

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get allocations for a specific section/semester (for admin to see what's assigned)
   */
  async getAllocationsBySectionSemester(
    sectionId: string,
    semesterNumber: number,
  ) {
    // Get section details
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { batch: true },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Get courses assigned to this batch/semester
    const semester = await this.prisma.semester.findUnique({
      where: { number: semesterNumber },
    });
    if (!semester) throw new NotFoundException(`Semester ${semesterNumber} not found`);
    const batchCourses = await this.prisma.batchCourseAssignment.findMany({
      where: {
        batchId: section.batchId,
        semesterId: semester.id,
      },
      include: {
        course: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Get allocations for this section/semester
    const allocationsResult = await this.findAll({ sectionId, semesterNumber });
    const allocations = allocationsResult.data;

    // Map courses to allocations
    return batchCourses.map((bc) => {
      const allocation = allocations.find(
        (a) => a.batchCourseAssignment.courseId === bc.courseId,
      );
      return {
        course: bc.course,
        isCompulsory: bc.isCompulsory,
        allocation: allocation || null, // null if not assigned yet
      };
    });
  }

  /**
   * Get one allocation by ID
   */
  async findOne(id: string) {
    const allocation = await this.prisma.courseAllocation.findUnique({
      where: { id },
      include: {
        batchCourseAssignment: { include: { course: true, semester: true } },
        faculty: true,
        section: {
          include: {
            batch: true,
          },
        },
        academicSession: true,
      },
    });

    if (!allocation) {
      throw new NotFoundException('Course allocation not found');
    }

    return allocation;
  }

  /**
   * Remove allocation (soft delete) and deactivate the enrollments it owned.
   */
  async remove(id: string) {
    const allocation = await this.findOne(id); // Validate exists

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
