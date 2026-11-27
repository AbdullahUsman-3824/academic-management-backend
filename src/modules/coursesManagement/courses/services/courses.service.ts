import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { UpdateCourseStatusDto } from '../dto/update-course-status.dto';
import { QueryCoursesDto } from '../dto/query-courses.dto';
import { CourseStatus } from '../enums/course-status.enum';
import { Prisma } from '../../../../generated/prisma/client';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseDto) {
    const code = dto.code.trim().toUpperCase();

    const existing = await this.prisma.course.findUnique({
      where: { code },
    });
    if (existing) {
      throw new ConflictException(`Course code "${code}" already exists`);
    }

    return this.prisma.course.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        creditHours: dto.creditHours,
        status: CourseStatus.ACTIVE,
      },
    });
  }

  async findAll(query: QueryCoursesDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20)); // safety bounds
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.search?.trim() && {
        OR: [
          { code: { contains: query.search.trim(), mode: 'insensitive' } },
          { name: { contains: query.search.trim(), mode: 'insensitive' } },
          {
            description: { contains: query.search.trim(), mode: 'insensitive' },
          },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
      }),
      this.prisma.course.count({ where }),
    ]);

    if (data.length === 0) {
      return {
        data: [],
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      };
    }

    const courseIds = data.map((c) => c.id);

    const usageCounts = await this.prisma.batchCourseAssignment.groupBy({
      by: ['courseId'],
      where: { courseId: { in: courseIds } },
      _count: { batchId: true },
    });

    const usageCountByCourseId = new Map(
      usageCounts.map((u) => [u.courseId, u._count.batchId]),
    );

    return {
      data: data.map((course) => ({
        ...course,
        usageCount: usageCountByCourseId.get(course.id) ?? 0,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const [usage] = await this.prisma.batchCourseAssignment.groupBy({
      by: ['courseId'],
      where: { courseId: id },
      _count: { batchId: true },
    });

    return {
      ...course,
      usageCount: usage?._count.batchId ?? 0,
    };
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.findOne(id);

    if (dto.code) {
      const code = dto.code.trim().toUpperCase();
      const existing = await this.prisma.course.findFirst({
        where: { code, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Course code "${code}" already exists`);
      }
    }

    return this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code.trim().toUpperCase() }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() ?? null,
        }),
        ...(dto.creditHours !== undefined && { creditHours: dto.creditHours }),
      },
    });
  }

  async updateStatus(id: string, dto: UpdateCourseStatusDto) {
    await this.findOne(id);

    return this.prisma.course.update({
      where: { id },
      data: { status: dto.status },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const [enrollments, allocations] = await Promise.all([
      this.prisma.courseEnrollment.count({
        where: { allocation: { batchCourseAssignment: { courseId: id } } },
      }),
      this.prisma.courseAllocation.count({
        where: { batchCourseAssignment: { courseId: id } },
      }),
    ]);

    if (enrollments > 0 || allocations > 0) {
      throw new ConflictException(
        'Cannot delete course that has enrollments or allocations. Deactivate it instead.',
      );
    }

    await this.prisma.course.delete({ where: { id } });
    return { id };
  }
}
