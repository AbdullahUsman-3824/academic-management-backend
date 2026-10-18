import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  CreateAllocationDto,
  BulkAllocationDto,
  GetAllocationsQueryDto,
} from '../dto';

@Injectable()
export class AllocationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a single course allocation
   */
  async create(dto: CreateAllocationDto) {
    // Validate all foreign keys
    const [course, faculty, section] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: dto.courseId } }),
      this.prisma.faculty.findUnique({ where: { id: dto.facultyId } }),
      this.prisma.section.findUnique({
        where: { id: dto.sectionId },
        include: { batch: true },
      }),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!faculty) throw new NotFoundException('Faculty not found');
    if (!section) throw new NotFoundException('Section not found');

    // Always use the active academic session
    const activeSession = await this.prisma.academicSession.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
    });
    if (!activeSession) {
      throw new BadRequestException(
        'No active academic session found. Please activate a session in Academic Management first.',
      );
    }
    const academicSessionId = activeSession.id;

    // Auto-detect semester from section's current academic records
    const sectionRecord = await this.prisma.studentAcademicRecord.findFirst({
      where: {
        sectionId: dto.sectionId,
        academicSessionId: activeSession.id,
      },
      select: { semesterNumber: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!sectionRecord) {
      throw new BadRequestException(
        `No academic records found for section ${section.name}. Please ensure students are enrolled in this section for the current session.`,
      );
    }

    const semesterNumber = sectionRecord.semesterNumber;

    // Validate course is assigned to this batch/semester
    const batchCourseAssignment =
      await this.prisma.batchCourseAssignment.findFirst({
        where: {
          batchId: section.batchId,
          courseId: dto.courseId,
          semesterNumber: semesterNumber,
          OR: [
            { sectionId: null }, // Batch-wide
            { sectionId: dto.sectionId }, // Section-specific
          ],
        },
      });

    if (!batchCourseAssignment) {
      throw new BadRequestException(
        `Course ${course.code} is not assigned to ${section.batch.name} for Semester ${semesterNumber}. Please assign the course to this batch first.`,
      );
    }

    try {
      // Create allocation and auto-enroll students in a transaction
      return await this.prisma.$transaction(async (tx) => {
        // Create the allocation
        const allocation = await tx.courseAllocation.create({
          data: {
            courseId: dto.courseId,
            facultyId: dto.facultyId,
            sectionId: dto.sectionId,
            semesterNumber: semesterNumber,
            academicSessionId,
            status: 'active',
          },
          include: {
            course: {
              select: {
                id: true,
                code: true,
                name: true,
                creditHours: true,
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
        const studentRecords = await tx.studentAcademicRecord.findMany({
          where: {
            sectionId: dto.sectionId,
            semesterNumber: semesterNumber,
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
            await tx.courseEnrollment.create({
              data: {
                studentAcademicRecordId: record.id,
                courseId: dto.courseId,
                allocationId: allocation.id,
                status: 'enrolled',
                isExtra: false,
              },
            });
            enrolledCount++;
          } catch (err: any) {
            // Skip if already enrolled (P2002 = unique constraint)
            if (err.code === 'P2002') {
              skippedCount++;
            } else {
              console.error(
                `Failed to enroll student ${record.student.stdRegNumber}:`,
                err.message,
              );
            }
          }
        }

        console.log(
          `[ALLOCATION] Created allocation for ${course.code} in ${section.name}`,
        );
        console.log(
          `[AUTO-ENROLL] Enrolled ${enrolledCount} students, skipped ${skippedCount}`,
        );

        return allocation;
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
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
    sectionId?: string,
  ) {
    const whereClause: any = {
      batchId,
      semesterNumber,
    };

    // If sectionId is provided, get courses for that section OR batch-wide courses
    if (sectionId) {
      whereClause.OR = [
        { sectionId: null }, // Batch-wide courses
        { sectionId }, // Section-specific courses
      ];
    } else {
      // If no sectionId, only get batch-wide courses
      whereClause.sectionId = null;
    }

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
    const uniqueCourses = new Map();
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
    const results: any[] = [];
    const errors: Array<{ courseId: string; error: string }> = [];

    for (const courseId of dto.courseIds) {
      try {
        const allocation = await this.create({
          facultyId: dto.facultyId,
          courseId,
          sectionId: dto.sectionId,
        });
        results.push(allocation);
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
        created: results.length,
        failed: errors.length,
      },
    };
  }

  /**
   * Get allocations with various filters
   * Always filters by active academic session
   * Returns paginated results
   */
  async findAll(query: GetAllocationsQueryDto = {}) {
    // Always filter by active session
    const activeSession = await this.prisma.academicSession.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
    });
    if (!activeSession) {
      throw new BadRequestException(
        'No active academic session found. Please activate a session in Academic Management first.',
      );
    }

    const where: any = {
      status: query.status || 'active',
      academicSessionId: activeSession.id, // Always use active session
    };

    if (query.facultyId) where.facultyId = query.facultyId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.semesterNumber) where.semesterNumber = query.semesterNumber;

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
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            creditHours: true,
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
      orderBy: [
        { semesterNumber: 'asc' },
        { section: { name: 'asc' } },
        { course: { code: 'asc' } },
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
    const batchCourses = await this.prisma.batchCourseAssignment.findMany({
      where: {
        batchId: section.batchId,
        semesterNumber,
        OR: [{ sectionId: null }, { sectionId }],
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
      const allocation = allocations.find((a) => a.courseId === bc.courseId);
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
        course: true,
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
   * Remove allocation (soft delete)
   */
  async remove(id: string) {
    await this.findOne(id); // Validate exists
    await this.prisma.courseAllocation.update({
      where: { id },
      data: { status: 'inactive' },
    });
    return { id, message: 'Allocation removed successfully' };
  }
}
