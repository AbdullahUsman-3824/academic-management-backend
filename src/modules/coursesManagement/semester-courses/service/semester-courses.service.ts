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

    // NEW: Validate semester exists
    const semester = await this.prisma.semester.findUnique({
      where: { id: dto.semesterId }, // CHANGED: Use semesterId from DTO
    });
    if (!semester) throw new NotFoundException('Semester not found');

    try {
      // Get semester number for backward compatibility
      const semesterNumber = semester.number;

      return await this.prisma.semesterCourse.create({
        data: {
          semesterId: dto.semesterId, // CHANGED
          semesterNumber, // Keep for backward compatibility
          courseId: dto.courseId,
          isCompulsory: dto.isCompulsory ?? true,
          displayOrder: dto.displayOrder ?? 0,
        },
        include: {
          course: true,
          semester: true, // NEW: Include semester details
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          `This course is already mapped to ${semester.displayName}`,
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
          semesterId: dto.semesterId, // CHANGED
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

  // NEW: Accept semesterId instead of semesterNumber
  async findBySemester(semesterId: string) {
    return this.prisma.semesterCourse.findMany({
      where: { semesterId }, // CHANGED: UUID instead of number
      include: {
        course: true,
        semester: true, // NEW: Include semester details
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  // OPTIONAL: Keep backward compatibility method
  async findBySemesterNumber(semesterNumber: number) {
    const semester = await this.prisma.semester.findUnique({
      where: { number: semesterNumber },
    });
    if (!semester) {
      throw new NotFoundException(`Semester ${semesterNumber} not found`);
    }
    return this.findBySemester(semester.id);
  }

  async findAll() {
    return this.prisma.semesterCourse.findMany({
      include: {
        course: true,
        semester: true, // NEW: Include semester details
      },
      orderBy: [{ semester: { number: 'asc' } }, { displayOrder: 'asc' }],
    });
  }

  async remove(id: string) {
    await this.prisma.semesterCourse.delete({ where: { id } });
    return { id };
  }
}