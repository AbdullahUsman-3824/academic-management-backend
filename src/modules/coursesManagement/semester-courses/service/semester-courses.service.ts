import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  CreateSemesterCourseDto,
  BulkSemesterCourseDto,
} from '../dto/semester-course.dto';

@Injectable()
export class SemesterCoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSemesterCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    try {
      return await this.prisma.semesterCourse.create({
        data: {
          semesterNumber: dto.semesterNumber,
          courseId: dto.courseId,
          isCompulsory: dto.isCompulsory ?? true,
          displayOrder: dto.displayOrder ?? 0,
        },
        include: { course: true },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'This course is already mapped to this semester',
        );
      }
      throw e;
    }
  }

  async bulkCreate(dto: BulkSemesterCourseDto) {
    const results: any[] = [];
    for (const courseId of dto.courseIds) {
      try {
        const row = await this.create({
          semesterNumber: dto.semesterNumber,
          courseId,
          isCompulsory: true,
        });
        results.push(row);
      } catch (error) {
        // skip duplicates
      }
    }
    return results;
  }

  async findBySemester(semesterNumber: number) {
    return this.prisma.semesterCourse.findMany({
      where: { semesterNumber },
      include: { course: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.semesterCourse.findMany({
      include: { course: true },
      orderBy: [{ semesterNumber: 'asc' }, { displayOrder: 'asc' }],
    });
  }

  async remove(id: string) {
    await this.prisma.semesterCourse.delete({ where: { id } });
    return { id };
  }
}