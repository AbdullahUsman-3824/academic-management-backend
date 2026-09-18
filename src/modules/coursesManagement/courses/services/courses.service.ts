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
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { code: { contains: query.search, mode: 'insensitive' } },
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
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

    return {
      data,
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
    return course;
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
      this.prisma.courseEnrollment.count({ where: { courseId: id } }),
      this.prisma.courseAllocation.count({ where: { courseId: id } }),
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
