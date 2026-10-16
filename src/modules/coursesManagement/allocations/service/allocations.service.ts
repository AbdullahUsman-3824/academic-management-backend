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
    // Validate semester number
    if (dto.semesterNumber < 1 || dto.semesterNumber > 10) {
      throw new BadRequestException('Semester number must be between 1 and 10');
    }

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

    // Get or validate academic session
    let academicSessionId = dto.academicSessionId;
    if (!academicSessionId) {
      const activeSession = await this.prisma.academicSession.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'desc' },
      });
      if (!activeSession) {
        throw new BadRequestException('No active academic session found');
      }
      academicSessionId = activeSession.id;
    }

    // Validate course is assigned to this batch/semester
    const batchCourseAssignment =
      await this.prisma.batchCourseAssignment.findFirst({
        where: {
          batchId: section.batchId,
          courseId: dto.courseId,
          semesterNumber: dto.semesterNumber,
          OR: [
            { sectionId: null }, // Batch-wide
            { sectionId: dto.sectionId }, // Section-specific
          ],
        },
      });

    if (!batchCourseAssignment) {
      throw new BadRequestException(
        `Course ${course.code} is not assigned to ${section.batch.name} for Semester ${dto.semesterNumber}. Please assign the course to this batch first.`,
      );
    }

    try {
      return await this.prisma.courseAllocation.create({
        data: {
          courseId: dto.courseId,
          facultyId: dto.facultyId,
          sectionId: dto.sectionId,
          semesterNumber: dto.semesterNumber,
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
   * Bulk create allocations (multiple courses for same teacher/section/semester)
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
          semesterNumber: dto.semesterNumber,
          academicSessionId: dto.academicSessionId,
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
   */
  async findAll(query: GetAllocationsQueryDto = {}) {
    const where: any = {
      status: query.status || 'active',
    };

    if (query.facultyId) where.facultyId = query.facultyId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.semesterNumber) where.semesterNumber = query.semesterNumber;
    if (query.academicSessionId)
      where.academicSessionId = query.academicSessionId;

    return this.prisma.courseAllocation.findMany({
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
    });
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
    const allocations = await this.findAll({ sectionId, semesterNumber });

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
