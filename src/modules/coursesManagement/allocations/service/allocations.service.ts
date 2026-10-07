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
    const [course, faculty, section, semester] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: dto.courseId } }),
      this.prisma.faculty.findUnique({ where: { id: dto.facultyId } }),
      this.prisma.section.findUnique({ where: { id: dto.sectionId } }),
      this.prisma.semester.findUnique({ where: { id: dto.semesterId } }),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!faculty) throw new NotFoundException('Faculty not found');
    if (!section) throw new NotFoundException('Section not found');
    if (!semester) throw new NotFoundException('Semester not found');

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

    // Validate course is in semester
    const semesterCourse = await this.prisma.semesterCourse.findFirst({
      where: {
        semesterId: dto.semesterId,
        courseId: dto.courseId,
      },
    });

    if (!semesterCourse) {
      throw new BadRequestException(
        `Course ${course.code} is not mapped to ${semester.displayName}`,
      );
    }

    try {
      return await this.prisma.courseAllocation.create({
        data: {
          courseId: dto.courseId,
          facultyId: dto.facultyId,
          sectionId: dto.sectionId,
          semesterId: dto.semesterId,
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
          semester: {
            select: {
              id: true,
              number: true,
              name: true,
              displayName: true,
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
          semesterId: dto.semesterId,
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
    if (query.semesterId) where.semesterId = query.semesterId;
    if (query.academicSessionId) where.academicSessionId = query.academicSessionId;

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
        semester: {
          select: {
            id: true,
            number: true,
            name: true,
            displayName: true,
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
        { semester: { number: 'asc' } },
        { section: { name: 'asc' } },
        { course: { code: 'asc' } },
      ],
    });
  }

  /**
   * Get allocations for a specific section/semester (for admin to see what's assigned)
   */
  async getAllocationsBySectionSemester(sectionId: string, semesterId: string) {
    // Get courses in this semester
    const semesterCourses = await this.prisma.semesterCourse.findMany({
      where: { semesterId },
      include: {
        course: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Get allocations for this section/semester
    const allocations = await this.findAll({ sectionId, semesterId });

    // Map courses to allocations
    return semesterCourses.map((sc) => {
      const allocation = allocations.find((a) => a.courseId === sc.courseId);
      return {
        course: sc.course,
        isCompulsory: sc.isCompulsory,
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
        semester: true,
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

  /**
   * Get faculty's teaching assignments (for faculty portal)
   */
  async getMyAllocations(facultyId: string, academicSessionId?: string) {
    const where: any = {
      facultyId,
      status: 'active',
    };

    if (!academicSessionId) {
      const activeSession = await this.prisma.academicSession.findFirst({
        where: { status: 'ACTIVE' },
      });
      if (activeSession) {
        where.academicSessionId = activeSession.id;
      }
    } else {
      where.academicSessionId = academicSessionId;
    }

    return this.prisma.courseAllocation.findMany({
      where,
      include: {
        course: true,
        section: {
          include: {
            batch: true,
          },
        },
        semester: true,
        academicSession: true,
        _count: {
          select: {
            assessments: true,
          },
        },
      },
      orderBy: [
        { semester: { number: 'asc' } },
        { course: { code: 'asc' } },
      ],
    });
  }
}
