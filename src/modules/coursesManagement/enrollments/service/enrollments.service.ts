import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { BatchCourseAssignmentsService } from '../../batch-courses/service/batch-course-assignments.service';
import {
  CreateEnrollmentDto,
  UpdateEnrollmentStatusDto,
  BulkEnrollDto,
} from '../dto/enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly batchCourseService: BatchCourseAssignmentsService,
  ) {}

  async create(dto: CreateEnrollmentDto) {
    // Verify student academic record exists
    const studentRecord = await this.prisma.studentAcademicRecord.findUnique({
      where: { id: dto.studentAcademicRecordId },
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

      if (allocation.courseId !== dto.courseId) {
        throw new BadRequestException(
          'Allocation does not match the selected course',
        );
      }
    }

    try {
      return await this.prisma.courseEnrollment.create({
        data: {
          studentAcademicRecordId: dto.studentAcademicRecordId,
          courseId: dto.courseId,
          isExtra: dto.isExtra ?? false,
          allocationId: dto.allocationId,
          status: 'enrolled',
        },
        include: {
          course: true,
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
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Student is already enrolled in this course',
        );
      }
      throw error;
    }
  }

  async bulkEnroll(dto: BulkEnrollDto) {
    const results: any[] = [];
    const errors: Array<{ courseId: string; error: string }> = [];

    for (const courseId of dto.courseIds) {
      try {
        const enrollment = await this.create({
          studentAcademicRecordId: dto.studentAcademicRecordId,
          courseId,
          isExtra: dto.isExtra,
        });
        results.push(enrollment);
      } catch (error: any) {
        errors.push({
          courseId,
          error: error.message,
        });
      }
    }

    return {
      success: results,
      errors,
      summary: {
        total: dto.courseIds.length,
        enrolled: results.length,
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
      where: { status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
    });

    const search = filters?.search?.trim();
    const hasSearch = !!search && search.length >= 2;

    // Build student record filters
    const studentRecordWhere: any = {
      ...(activeSession && { academicSessionId: activeSession.id }),
      ...(filters?.studentId && { studentId: filters.studentId }),
      ...(filters?.sectionId && { sectionId: filters.sectionId }),
    };

    // Only add student filters if any are provided
    const hasStudentFilters = hasSearch || filters?.batchId || filters?.studentStatus;
    
    if (hasStudentFilters) {
      const studentWhere: any = {};
      
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
        course: true,
        allocation: {
          include: {
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
        course: true,
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
        course: true,
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
        course: true,
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
    await this.prisma.courseEnrollment.delete({ where: { id } });
    return { id };
  }

  async getEnrollmentStats(studentAcademicRecordId: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { studentAcademicRecordId },
      include: {
        course: true,
      },
    });

    const totalCreditHours = enrollments.reduce(
      (sum, e) => sum + e.course.creditHours,
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
      where: { status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
    });

    if (!activeSession) {
      throw new BadRequestException('No active academic session found');
    }

    // Find all active allocations for this course in the current session
    const allocations = await this.prisma.courseAllocation.findMany({
      where: {
        courseId,
        academicSessionId: activeSession.id,
        status: 'active',
      },
      include: {
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
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            creditHours: true,
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
      courseId: alloc.courseId,
      course: alloc.course,
      semesterNumber: alloc.semesterNumber,
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
      displayText: `Batch ${alloc.section.batch.name} - Section ${alloc.section.name} - Semester ${alloc.semesterNumber} (${alloc.faculty.firstName} ${alloc.faculty.lastName})`,
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
    tx?: any,
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
        console.warn(
          `[AUTO-ENROLL] No courses assigned to Batch ${batchId}, Semester ${semesterNumber}`,
        );
        return { created: [], skipped: 0, errors: [] };
      }

      // Filter compulsory courses only
      const compulsoryCourses = batchCourses.filter((c) => c.isCompulsory);

      const created: any[] = [];
      const errors: Array<{ courseId: string; error: string }> = [];
      let skipped = 0;

      for (const course of compulsoryCourses) {
        try {
          await prisma.courseEnrollment.create({
            data: {
              studentAcademicRecordId,
              courseId: course.id,
              status: 'enrolled',
              isExtra: false,
            },
          });

          created.push({
            courseId: course.id,
            courseCode: course.code,
            courseName: course.name,
            creditHours: course.creditHours,
          });

          console.log(
            `[AUTO-ENROLL] ✓ ${course.code}: ${course.name} (Semester ${semesterNumber})`,
          );
        } catch (error: any) {
          if (error.code === 'P2002') {
            skipped++;
            console.debug(
              `[AUTO-ENROLL] ⊘ Student already enrolled in ${course.code}`,
            );
          } else {
            errors.push({ courseId: course.id, error: error.message });
            console.error(`[AUTO-ENROLL] ✗ ${course.code}: ${error.message}`);
          }
        }
      }

      console.log(
        `[AUTO-ENROLL] Semester ${semesterNumber} complete: ` +
          `${created.length} created, ${skipped} skipped, ${errors.length} errors`,
      );

      return { created, skipped, errors };
    } catch (error: any) {
      console.error('[AUTO-ENROLL] Fatal error:', error);
      throw new BadRequestException(
        `Auto-enrollment failed: ${error.message}`,
      );
    }
  }

  /**
   * DEPRECATED: Old method using SemesterCourses
   * Keep for backward compatibility during migration
   */
  async autoEnrollInSemesterCourses(
    studentAcademicRecordId: string,
    semesterId: string,
    tx?: any,
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
      const semesterCourses = await prisma.semesterCourse.findMany({
        where: {
          semesterId,
          isCompulsory: true,
        },
        include: {
          course: {
            select: {
              id: true,
              code: true,
              name: true,
              status: true,
              creditHours: true,
            },
          },
          semester: {
            select: {
              number: true,
              name: true,
              displayName: true,
            },
          },
        },
        orderBy: { displayOrder: 'asc' },
      });

      const activeCourses = semesterCourses.filter(
        (sc) => sc.course.status === 'active',
      );

      if (activeCourses.length === 0) {
        const semesterName =
          semesterCourses[0]?.semester?.displayName ?? semesterId;
        console.warn(
          `[AUTO-ENROLL] No active compulsory courses for ${semesterName}`,
        );
        return { created: [], skipped: 0, errors: [] };
      }

      const created: any[] = [];
      const errors: Array<{ courseId: string; error: string }> = [];
      let skipped = 0;

      for (const sc of activeCourses) {
        try {
          await prisma.courseEnrollment.create({
            data: {
              studentAcademicRecordId,
              courseId: sc.courseId,
              status: 'enrolled',
              isExtra: false,
            },
          });

          created.push({
            courseId: sc.courseId,
            courseCode: sc.course.code,
            courseName: sc.course.name,
            creditHours: sc.course.creditHours,
          });

          console.log(
            `[AUTO-ENROLL] ✓ ${sc.course.code}: ${sc.course.name} ` +
              `(${sc.semester.displayName})`,
          );
        } catch (error: any) {
          if (error.code === 'P2002') {
            skipped++;
            console.debug(
              `[AUTO-ENROLL] ⊘ Student already enrolled in ${sc.course.code}`,
            );
          } else {
            errors.push({ courseId: sc.courseId, error: error.message });
            console.error(
              `[AUTO-ENROLL] ✗ ${sc.course.code}: ${error.message}`,
            );
          }
        }
      }

      console.log(
        `[AUTO-ENROLL] ${semesterCourses[0]?.semester?.displayName} complete: ` +
          `${created.length} created, ${skipped} skipped, ${errors.length} errors`,
      );

      return { created, skipped, errors };
    } catch (error: any) {
      console.error('[AUTO-ENROLL] Fatal error:', error);
      throw new BadRequestException(
        `Auto-enrollment failed: ${error.message}`,
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
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'desc' },
      });
      if (!activeSession) {
        throw new BadRequestException('No active academic session found');
      }
      sessionId = activeSession.id;
    }

    // Build filter for academic records
    const recordWhere: any = {
      academicSessionId: sessionId,
      status: 'ENROLLED',
    };
    if (options?.batchId) {
      recordWhere.batchId = options.batchId;
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
          },
        },
        _count: {
          select: {
            courseEnrollments: true,
          },
        },
      },
    });

    console.log(
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

        // Skip if student already has enrollments (unless they have 0)
        if (enrollmentsBefore > 0) {
          console.log(
            `[BULK RE-ENROLL] Skipping ${record.student.stdRegNumber} - already has ${enrollmentsBefore} enrollments`,
          );
          continue;
        }

        if (dryRun) {
          // Dry run: just check what would be enrolled
          const batchCourses =
            await this.batchCourseService.getCoursesForEnrollment(
              record.batchId,
              record.semesterNumber,
            );
          const compulsoryCourses = batchCourses.filter((c) => c.isCompulsory);

          results.push({
            studentId: record.studentId,
            studentName: `${record.student.firstName} ${record.student.lastName}`,
            studentNumber: record.student.stdRegNumber,
            recordId: record.id,
            batchId: record.batchId,
            semesterNumber: record.semesterNumber,
            enrollmentsBefore,
            enrollmentsCreated: compulsoryCourses.length,
            coursesEnrolled: compulsoryCourses.map((c) => ({
              courseCode: c.code,
              courseName: c.name,
            })),
            errors: [],
          });

          totalEnrollmentsCreated += compulsoryCourses.length;
          studentsProcessed++;
        } else {
          // Actual enrollment
          const enrollResult = await this.autoEnrollInBatchCourses(
            record.id,
            record.batchId,
            record.semesterNumber,
          );

          results.push({
            studentId: record.studentId,
            studentName: `${record.student.firstName} ${record.student.lastName}`,
            studentNumber: record.student.stdRegNumber,
            recordId: record.id,
            batchId: record.batchId,
            semesterNumber: record.semesterNumber,
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

          console.log(
            `[BULK RE-ENROLL] ✓ ${record.student.stdRegNumber}: ${enrollResult.created.length} courses enrolled`,
          );
        }
      } catch (error: any) {
        console.error(
          `[BULK RE-ENROLL] ✗ ${record.student.stdRegNumber}: ${error.message}`,
        );
        globalErrors.push({
          studentId: record.studentId,
          error: error.message,
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

    console.log(
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
