import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
import { BatchCourseAssignmentsService } from '../../batch-courses/services/batch-course-assignments.service';
import {
  CreateEnrollmentDto,
  UpdateEnrollmentStatusDto,
  BulkEnrollDto,
} from '../dto/enrollment.dto';
import {
  ACADEMIC_SESSION_STATUS,
  ENROLLMENT_STATUS,
  STUDENT_RECORD_STATUS,
} from '../../../../common/constants/status.constants';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly batchCourseService: BatchCourseAssignmentsService,
  ) {}

  /**
   * Credit-hour load for a student's current semester, summed over active
   * (non-dropped) enrollments. Used to enforce Semester.min/maxCredits.
   */
  private async currentCreditLoad(
    prisma: PrismaService | Prisma.TransactionClient,
    studentAcademicRecordId: string,
  ): Promise<{ credits: number; maxCredits: number | null }> {
    const record = await prisma.studentAcademicRecord.findUnique({
      where: { id: studentAcademicRecordId },
      select: { semester: { select: { number: true, maxCredits: true } } },
    });
    const semester = record?.semester;

    const enrolled = await prisma.courseEnrollment.findMany({
      where: {
        studentAcademicRecordId,
        status: { not: ENROLLMENT_STATUS.DROPPED },
      },
      include: {
        allocation: {
          include: { batchCourseAssignment: { include: { course: { select: { creditHours: true } } } } },
        },
      },
    });
    const credits = enrolled.reduce(
      (sum, e) => sum + (e.allocation.batchCourseAssignment.course.creditHours || 0),
      0,
    );
    return { credits, maxCredits: semester?.maxCredits ?? null };
  }

  async create(dto: CreateEnrollmentDto) {
    let studentAcademicRecordId = dto.studentAcademicRecordId;

    // If studentId is provided instead of studentAcademicRecordId, look up the academic record
    if (!studentAcademicRecordId && dto.studentId) {
      // Get active academic session
      const activeSession = await this.prisma.academicSession.findFirst({
        where: { status: ACADEMIC_SESSION_STATUS.ACTIVE },
        orderBy: { startDate: 'desc' },
      });

      if (!activeSession) {
        throw new BadRequestException(
          'No active academic session found. Please activate a session in Academic Management first.',
        );
      }

      // Find student's academic record for the active session
      const academicRecord = await this.prisma.studentAcademicRecord.findFirst({
        where: {
          studentId: dto.studentId,
          academicSessionId: activeSession.id,
        },
        include: {
          student: {
            select: {
              id: true,
              batchId: true,
              stdRegNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!academicRecord) {
        throw new BadRequestException(
          'Student does not have an academic record for the current session. Please ensure the student is enrolled in a batch and section for the active academic session.',
        );
      }

      studentAcademicRecordId = academicRecord.id;
    }

    // Validate that we have a studentAcademicRecordId
    if (!studentAcademicRecordId) {
      throw new BadRequestException(
        'Either studentAcademicRecordId or studentId must be provided',
      );
    }
    if (!dto.allocationId) {
      throw new BadRequestException(
        'allocationId is required for course enrollments',
      );
    }

    // Verify student academic record exists
    const studentRecord = await this.prisma.studentAcademicRecord.findUnique({
      where: { id: studentAcademicRecordId },
      include: {
        student: {
          select: {
            id: true,
            batchId: true,
          },
        },
      },
    });
    if (!studentRecord) {
      throw new NotFoundException('Student academic record not found');
    }

    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // If this is an extra course, validate and require allocationId
    if (dto.isExtra) {
      if (!dto.allocationId) {
        throw new BadRequestException(
          'allocationId is required for extra course enrollments',
        );
      }

      // Verify allocation exists and is active
      const allocation = await this.prisma.courseAllocation.findUnique({
        where: { id: dto.allocationId },
        include: {
          batchCourseAssignment: { include: { course: true } },
          section: {
            include: {
              batch: true,
            },
          },
          faculty: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!allocation) {
        throw new NotFoundException('Course allocation not found');
      }

      if (allocation.status !== 'active') {
        throw new BadRequestException('Selected allocation is not active');
      }

      if (allocation.batchCourseAssignment.courseId !== dto.courseId) {
        throw new BadRequestException(
          'Allocation does not match the selected course',
        );
      }
    }

    // Enforce the semester credit-hour ceiling (#7)
    const { credits, maxCredits } = await this.currentCreditLoad(
      this.prisma,
      studentAcademicRecordId,
    );
    if (maxCredits != null && credits + course.creditHours > maxCredits) {
      throw new BadRequestException(
        `Enrolling in ${course.code} would exceed the maximum credit hours for this semester (${credits} + ${course.creditHours} > ${maxCredits}).`,
      );
    }

    try {
      return await this.prisma.courseEnrollment.create({
        data: {
          studentAcademicRecordId,
          isExtra: dto.isExtra ?? false,
          allocationId: dto.allocationId,
          status: ENROLLMENT_STATUS.ENROLLED,
        },
        include: {
          allocation: {
            include: {
              section: {
                include: {
                  batch: true,
                },
              },
              faculty: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeNumber: true,
                },
              },
            },
          },
          studentAcademicRecord: {
            include: {
              student: {
                select: {
                  id: true,
                  stdRegNumber: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError.code === 'P2002') {
        throw new ConflictException(
          'Student is already enrolled in this course',
        );
      }
      throw error;
    }
  }

  async bulkEnroll(dto: BulkEnrollDto) {
    const results: Array<
      Awaited<ReturnType<EnrollmentsService['create']>>
    > = [];
    const errors: Array<{ courseId: string; error: string }> = [];

    for (const courseId of dto.courseIds) {
      try {
        const enrollment = await this.create({
          studentAcademicRecordId: dto.studentAcademicRecordId,
          studentId: dto.studentId,
          courseId,
          isExtra: dto.isExtra,
        });
        results.push(enrollment);
      } catch (error: unknown) {
        errors.push({
          courseId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: results,
      errors,
      summary: {
        total: dto.courseIds.length,
        created: results.length,
        failed: errors.length,
      },
    };
  }

  async findAll(filters?: {
    studentId?: string;
    studentAcademicRecordId?: string;
    courseId?: string;
    status?: string;
    search?: string;
    batchId?: string;
    sectionId?: string;
    studentStatus?: string;
    page?: number;
    limit?: number;
  }) {
    // Always filter by active session
    const activeSession = await this.prisma.academicSession.findFirst({
      where: { status: ACADEMIC_SESSION_STATUS.ACTIVE },
      orderBy: { startDate: 'desc' },
    });

    const search = filters?.search?.trim();
    const hasSearch = !!search && search.length >= 2;

    // Build student record filters
    const studentRecordWhere: Prisma.StudentAcademicRecordWhereInput = {
      ...(activeSession && { academicSessionId: activeSession.id }),
      ...(filters?.studentId && { studentId: filters.studentId }),
      ...(filters?.sectionId && { sectionId: filters.sectionId }),
    };

    // Only add student filters if any are provided
    const hasStudentFilters = hasSearch || filters?.batchId || filters?.studentStatus;
    
    if (hasStudentFilters) {
      const studentWhere: Prisma.StudentWhereInput = {};
      
      if (filters?.batchId) {
        studentWhere.batchId = filters.batchId;
      }
      
      if (filters?.studentStatus) {
        studentWhere.status = filters.studentStatus;
      }
      
      if (hasSearch) {
        studentWhere.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { middleName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { stdRegNumber: { contains: search, mode: 'insensitive' } },
          { cnic: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      studentRecordWhere.student = studentWhere;
    }

    const where = {
      studentAcademicRecordId: filters?.studentAcademicRecordId,
      courseId: filters?.courseId,
      status: filters?.status,
      studentAcademicRecord: studentRecordWhere,
    };

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.prisma.courseEnrollment.count({ where });

    // Get paginated data
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where,
      include: {
        allocation: {
          include: {
            batchCourseAssignment: { include: { course: true } },
            section: {
              include: {
                batch: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            faculty: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
              },
            },
          },
        },
        studentAcademicRecord: {
          include: {
            student: {
              select: {
                id: true,
                stdRegNumber: true,
                firstName: true,
                lastName: true,
                middleName: true,
                cnic: true,
                status: true,
                batchId: true,
                batch: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            academicSession: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Map stdRegNumber to studentNumber for frontend compatibility
    const data = enrollments.map((enrollment) => ({
      ...enrollment,
      studentAcademicRecord: enrollment.studentAcademicRecord
        ? {
            ...enrollment.studentAcademicRecord,
            student: enrollment.studentAcademicRecord.student
              ? {
                  ...enrollment.studentAcademicRecord.student,
                  studentNumber: enrollment.studentAcademicRecord.student.stdRegNumber,
                }
              : undefined,
          }
        : undefined,
    }));

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

  async findOne(id: string) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id },
      include: {
        studentAcademicRecord: {
          include: {
            student: true,
            academicSession: true,
            section: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return enrollment;
  }

  async findByStudent(studentId: string, academicSessionId?: string) {
    return this.prisma.courseEnrollment.findMany({
      where: {
        studentAcademicRecord: {
          studentId,
          ...(academicSessionId && { academicSessionId }),
        },
      },
      include: {
        allocation: { include: { batchCourseAssignment: { include: { course: true } } } },
        studentAcademicRecord: {
          include: {
            academicSession: true,
            section: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateStatus(id: string, dto: UpdateEnrollmentStatusDto) {
    const enrollment = await this.findOne(id);

    // Validate status transitions
    if (enrollment.status === 'completed' && dto.status !== 'reappear') {
      throw new BadRequestException(
        'Cannot change status of completed enrollment except to reappear',
      );
    }

    return this.prisma.courseEnrollment.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === 'dropped' && { droppedAt: new Date() }),
      },
      include: {
        allocation: { include: { batchCourseAssignment: { include: { course: true } } } },
        studentAcademicRecord: {
          include: {
            student: {
              select: {
                id: true,
                stdRegNumber: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  async drop(id: string) {
    return this.updateStatus(id, { status: 'dropped' });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft delete: mark as dropped instead of deleting, so existing marks /
    // results stay linked and auditable (#10).
    await this.prisma.courseEnrollment.update({
      where: { id },
      data: { status: ENROLLMENT_STATUS.DROPPED, droppedAt: new Date() },
    });
    return { id };
  }

  async getEnrollmentStats(studentAcademicRecordId: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { studentAcademicRecordId },
      include: {
        allocation: { include: { batchCourseAssignment: { include: { course: true } } } },
      },
    });

    const totalCreditHours = enrollments.reduce(
      (sum, e) => sum + e.allocation.batchCourseAssignment.course.creditHours,
      0,
    );

    const stats = {
      total: enrollments.length,
      enrolled: enrollments.filter((e) => e.status === 'enrolled').length,
      dropped: enrollments.filter((e) => e.status === 'dropped').length,
      completed: enrollments.filter((e) => e.status === 'completed').length,
      failed: enrollments.filter((e) => e.status === 'failed').length,
      reappear: enrollments.filter((e) => e.status === 'reappear').length,
      totalCreditHours,
    };

    return stats;
  }

  /**
   * Get available course allocations for extra course enrollment
   * Returns all active sections teaching the specified course
   */
  async getAvailableAllocations(courseId: string) {
    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get active academic session
    const activeSession = await this.prisma.academicSession.findFirst({
      where: { status: ACADEMIC_SESSION_STATUS.ACTIVE },
      orderBy: { startDate: 'desc' },
    });

    if (!activeSession) {
      throw new BadRequestException('No active academic session found');
    }

    // Find all active allocations for this course in the current session
    const allocations = await this.prisma.courseAllocation.findMany({
      where: {
        batchCourseAssignment: { courseId },
        academicSessionId: activeSession.id,
        status: 'active',
      },
      include: {
        batchCourseAssignment: {
          include: {
            course: { select: { id: true, code: true, name: true, creditHours: true } },
            semester: { select: { number: true } },
          },
        },
        section: {
          include: {
            batch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        faculty: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { section: { batch: { name: 'asc' } } },
        { section: { name: 'asc' } },
      ],
    });

    // Transform to include helpful info
    return allocations.map((alloc) => ({
      id: alloc.id,
      courseId: alloc.batchCourseAssignment.courseId,
      course: alloc.batchCourseAssignment.course,
      semesterNumber: alloc.batchCourseAssignment.semester.number,
      section: {
        id: alloc.section.id,
        name: alloc.section.name,
        batch: alloc.section.batch,
      },
      faculty: {
        id: alloc.faculty.id,
        employeeNumber: alloc.faculty.employeeNumber,
        name: `${alloc.faculty.firstName} ${alloc.faculty.lastName}`,
      },
      displayText: `Batch ${alloc.section.batch.name} - Section ${alloc.section.name} - Semester ${alloc.batchCourseAssignment.semester.number} (${alloc.faculty.firstName} ${alloc.faculty.lastName})`,
    }));
  }

  /**
   * AUTO-ENROLL: Automatically enroll student in courses assigned to their batch/semester
   * NEW: Uses BatchCourseAssignments instead of SemesterCourses
   * @param studentAcademicRecordId - The newly created StudentAcademicRecord ID
   * @param batchId - The student's batch ID
   * @param semesterNumber - The semester number (1-10)
   * @param tx - Optional Prisma transaction client
   */
  async autoEnrollInBatchCourses(
    studentAcademicRecordId: string,
    batchId: string,
    semesterNumber: number,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    created: Array<{
      courseId: string;
      courseCode: string;
      courseName: string;
      creditHours: number;
    }>;
    skipped: number;
    errors: Array<{ courseId: string; error: string }>;
  }> {
    const prisma = tx || this.prisma;

    try {
      // Get courses assigned to this batch/semester
      const batchCourses =
        await this.batchCourseService.getCoursesForEnrollment(
          batchId,
          semesterNumber,
        );

      if (batchCourses.length === 0) {
        this.logger.warn(
          `[AUTO-ENROLL] No courses assigned to Batch ${batchId}, Semester ${semesterNumber}`,
        );
        return { created: [], skipped: 0, errors: [] };
      }

      // Filter compulsory courses only
      const compulsoryCourses = batchCourses.filter((c) => c.isCompulsory);

      const created: Array<{
        courseId: string;
        courseCode: string;
        courseName: string;
        creditHours: number;
      }> = [];
      const errors: Array<{ courseId: string; error: string }> = [];
      let skipped = 0;

      const academicRecord =
        await prisma.studentAcademicRecord.findUnique({
          where: { id: studentAcademicRecordId },
          select: { sectionId: true, academicSessionId: true },
        });
      if (!academicRecord) {
        throw new BadRequestException(
          'Student academic record not found',
        );
      }

      // Enforce the semester credit-hour ceiling even in auto-enrollment (#7)
      const { credits: startCredits, maxCredits } = await this.currentCreditLoad(
        prisma,
        studentAcademicRecordId,
      );
      let runningCredits = startCredits;

      for (const course of compulsoryCourses) {
        if (
          maxCredits != null &&
          runningCredits + course.creditHours > maxCredits
        ) {
          skipped++;
          this.logger.warn(
            `[AUTO-ENROLL] ⊘ ${course.code} skipped — would exceed max credits for the semester (${runningCredits} + ${course.creditHours} > ${maxCredits})`,
          );
          continue;
        }

        try {
          const allocation =
            await prisma.courseAllocation.findFirst({
              where: {
                sectionId: academicRecord.sectionId,
                academicSessionId: academicRecord.academicSessionId,
                batchCourseAssignment: { courseId: course.id },
              },
              select: { id: true },
            });
          if (!allocation) {
            skipped++;
            this.logger.warn(
              `[AUTO-ENROLL] ⊘ ${course.code} skipped — no course allocation found`,
            );
            continue;
          }

          await prisma.courseEnrollment.create({
            data: {
              studentAcademicRecordId,
              allocationId: allocation.id,
              status: ENROLLMENT_STATUS.ENROLLED,
              isExtra: false,
            },
          });

          runningCredits += course.creditHours;

          created.push({
            courseId: course.id,
            courseCode: course.code,
            courseName: course.name,
            creditHours: course.creditHours,
          });

          this.logger.log(
            `[AUTO-ENROLL] ✓ ${course.code}: ${course.name} (Semester ${semesterNumber})`,
          );
        } catch (error: unknown) {
          const prismaError = error as { code?: string; message?: string };
          if (prismaError.code === 'P2002') {
            skipped++;
            this.logger.debug(
              `[AUTO-ENROLL] ⊘ Student already enrolled in ${course.code}`,
            );
          } else {
            const message =
              prismaError.message ??
              (error instanceof Error ? error.message : String(error));
            errors.push({ courseId: course.id, error: message });
            this.logger.error(`[AUTO-ENROLL] ✗ ${course.code}: ${message}`);
          }
        }
      }

      this.logger.log(
        `[AUTO-ENROLL] Semester ${semesterNumber} complete: ` +
          `${created.length} created, ${skipped} skipped, ${errors.length} errors`,
      );

      return { created, skipped, errors };
    } catch (error: unknown) {
      this.logger.error('[AUTO-ENROLL] Fatal error:', error);
      const message =
        error instanceof Error ? error.message : String(error);
      throw new BadRequestException(
        `Auto-enrollment failed: ${message}`,
      );
    }
  }

  /**
   * BULK RE-ENROLLMENT: Find students with missing enrollments and enroll them
   * Useful for fixing data after batch course assignments are updated
   */
  async bulkReEnrollStudents(options?: {
    batchId?: string;
    academicSessionId?: string;
    dryRun?: boolean;
  }) {
    const dryRun = options?.dryRun ?? false;

    // Get active session if not provided
    let sessionId = options?.academicSessionId;
    if (!sessionId) {
      const activeSession = await this.prisma.academicSession.findFirst({
        where: { status: ACADEMIC_SESSION_STATUS.ACTIVE },
        orderBy: { startDate: 'desc' },
      });
      if (!activeSession) {
        throw new BadRequestException('No active academic session found');
      }
      sessionId = activeSession.id;
    }

    // Build filter for academic records
    const recordWhere: Prisma.StudentAcademicRecordWhereInput = {
      academicSessionId: sessionId,
      status: STUDENT_RECORD_STATUS.ENROLLED,
    };
    if (options?.batchId) {
      recordWhere.student = { batchId: options.batchId };
    }

    // Find all active academic records
    const academicRecords = await this.prisma.studentAcademicRecord.findMany({
      where: recordWhere,
      include: {
        student: {
          select: {
            id: true,
            stdRegNumber: true,
            firstName: true,
            lastName: true,
            batchId: true,
          },
        },
        semester: { select: { number: true } },
        _count: {
          select: {
            courseEnrollments: true,
          },
        },
      },
    });

    this.logger.log(
      `[BULK RE-ENROLL] Found ${academicRecords.length} student records`,
    );

    const results: Array<{
      studentId: string;
      studentName: string;
      studentNumber: string;
      recordId: string;
      batchId: string;
      semesterNumber: number;
      enrollmentsBefore: number;
      enrollmentsCreated: number;
      coursesEnrolled: Array<{
        courseCode: string;
        courseName: string;
      }>;
      errors: Array<{ courseId: string; error: string }>;
    }> = [];

    let totalEnrollmentsCreated = 0;
    let studentsProcessed = 0;
    const globalErrors: Array<{ studentId: string; error: string }> = [];

    for (const record of academicRecords) {
      try {
        const enrollmentsBefore = record._count.courseEnrollments;
        const batchId = record.student.batchId;
        const semesterNumber = record.semester.number;

        // Do NOT skip students who already have enrollments. Instead we top-up
        // only the batch courses they are still missing (#4).

        if (dryRun) {
          // Dry run: report only the compulsory courses not yet enrolled
          const batchCourses =
            await this.batchCourseService.getCoursesForEnrollment(
              batchId,
              semesterNumber,
            );
          const compulsoryCourses = batchCourses.filter((c) => c.isCompulsory);

          const existing = await this.prisma.courseEnrollment.findMany({
            where: { studentAcademicRecordId: record.id },
            select: {
              allocation: {
                select: { batchCourseAssignment: { select: { courseId: true } } },
              },
            },
          });
          const existingCourseIds = new Set(
            existing.map((e) => e.allocation.batchCourseAssignment.courseId),
          );
          const missingCourses = compulsoryCourses.filter(
            (c) => !existingCourseIds.has(c.id),
          );

          results.push({
            studentId: record.studentId,
            studentName: `${record.student.firstName} ${record.student.lastName}`,
            studentNumber: record.student.stdRegNumber,
            recordId: record.id,
            batchId,
            semesterNumber,
            enrollmentsBefore,
            enrollmentsCreated: missingCourses.length,
            coursesEnrolled: missingCourses.map((c) => ({
              courseCode: c.code,
              courseName: c.name,
            })),
            errors: [],
          });

          totalEnrollmentsCreated += missingCourses.length;
          studentsProcessed++;
        } else {
          // Actual enrollment
          const enrollResult = await this.autoEnrollInBatchCourses(
            record.id,
            batchId,
            semesterNumber,
          );

          results.push({
            studentId: record.studentId,
            studentName: `${record.student.firstName} ${record.student.lastName}`,
            studentNumber: record.student.stdRegNumber,
            recordId: record.id,
            batchId: record.student.batchId,
            semesterNumber: record.semester.number,
            enrollmentsBefore,
            enrollmentsCreated: enrollResult.created.length,
            coursesEnrolled: enrollResult.created.map((c) => ({
              courseCode: c.courseCode,
              courseName: c.courseName,
            })),
            errors: enrollResult.errors,
          });

          totalEnrollmentsCreated += enrollResult.created.length;
          studentsProcessed++;

          this.logger.log(
            `[BULK RE-ENROLL] ✓ ${record.student.stdRegNumber}: ${enrollResult.created.length} courses enrolled`,
          );
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `[BULK RE-ENROLL] ✗ ${record.student.stdRegNumber}: ${message}`,
        );
        globalErrors.push({
          studentId: record.studentId,
          error: message,
        });
      }
    }

    const summary = {
      dryRun,
      totalStudentsFound: academicRecords.length,
      studentsProcessed,
      studentsSkipped: academicRecords.length - studentsProcessed,
      totalEnrollmentsCreated,
      totalErrors: globalErrors.length,
    };

    this.logger.log(
      `[BULK RE-ENROLL] Summary: ${studentsProcessed} students processed, ${totalEnrollmentsCreated} enrollments created`,
    );

    return {
      success: true,
      summary,
      students: results,
      errors: globalErrors,
    };
  }

}
