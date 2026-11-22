import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  CreateBatchCourseAssignmentDto,
  BulkAssignCoursesDto,
  UpdateBatchCourseAssignmentDto,
  GetBatchCoursesQueryDto,
  BatchCourseAssignmentResponseDto,
} from '../dto/batch-course-assignment.dto';

@Injectable()
export class BatchCourseAssignmentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Assign a single course to a batch/semester.
   * Courses belong to the batch+semester and are shared across all its sections.
   */
  async create(
    dto: CreateBatchCourseAssignmentDto,
  ): Promise<BatchCourseAssignmentResponseDto> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
    });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${dto.batchId} not found`);
    }

    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${dto.courseId} not found`);
    }

    const existing = await this.prisma.batchCourseAssignment.findFirst({
      where: {
        batchId: dto.batchId,
        courseId: dto.courseId,
        semesterNumber: dto.semesterNumber,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Course ${course.code} is already assigned to this batch/semester`,
      );
    }

    const assignment = await this.prisma.batchCourseAssignment.create({
      data: {
        batchId: dto.batchId,
        courseId: dto.courseId,
        semesterNumber: dto.semesterNumber,
        isCompulsory: dto.isCompulsory ?? true,
        displayOrder: dto.displayOrder ?? 0,
      },
      include: {
        batch: { select: { id: true, name: true } },
        course: {
          select: { id: true, code: true, name: true, creditHours: true },
        },
      },
    });

    return assignment;
  }

  /**
   * Bulk assign multiple courses to a batch/semester.
   */
  async bulkAssign(dto: BulkAssignCoursesDto): Promise<{ count: number }> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
    });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${dto.batchId} not found`);
    }

    const courses = await this.prisma.course.findMany({
      where: { id: { in: dto.courseIds } },
    });
    if (courses.length !== dto.courseIds.length) {
      throw new BadRequestException('One or more courses not found');
    }

    const existing = await this.prisma.batchCourseAssignment.findMany({
      where: {
        batchId: dto.batchId,
        semesterNumber: dto.semesterNumber,
        courseId: { in: dto.courseIds },
      },
      select: { courseId: true },
    });

    const existingCourseIds = new Set(existing.map((e) => e.courseId));
    const newCourseIds = dto.courseIds.filter(
      (id) => !existingCourseIds.has(id),
    );

    if (newCourseIds.length === 0) {
      return { count: 0 };
    }

    await this.prisma.batchCourseAssignment.createMany({
      data: newCourseIds.map((courseId, index) => ({
        batchId: dto.batchId,
        courseId,
        semesterNumber: dto.semesterNumber,
        isCompulsory: dto.isCompulsory ?? true,
        displayOrder: index,
      })),
    });

    return { count: newCourseIds.length };
  }

  /**
   * Get courses assigned to a batch/semester.
   */
  async findAll(
    query: GetBatchCoursesQueryDto,
  ): Promise<BatchCourseAssignmentResponseDto[]> {
    const where: any = {
      batchId: query.batchId,
    };

    if (query.semesterNumber !== undefined) {
      where.semesterNumber = query.semesterNumber;
    }

    const assignments = await this.prisma.batchCourseAssignment.findMany({
      where,
      include: {
        batch: { select: { id: true, name: true } },
        course: {
          select: { id: true, code: true, name: true, creditHours: true },
        },
      },
      orderBy: [
        { semesterNumber: 'asc' },
        { displayOrder: 'asc' },
        { course: { code: 'asc' } },
      ],
    });

    return assignments;
  }

  /**
   * Get a single assignment.
   */
  async findOne(id: string): Promise<BatchCourseAssignmentResponseDto> {
    const assignment = await this.prisma.batchCourseAssignment.findUnique({
      where: { id },
      include: {
        batch: { select: { id: true, name: true } },
        course: {
          select: { id: true, code: true, name: true, creditHours: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Batch course assignment with ID ${id} not found`,
      );
    }

    return assignment;
  }

  /**
   * Update an assignment.
   */
  async update(
    id: string,
    dto: UpdateBatchCourseAssignmentDto,
  ): Promise<BatchCourseAssignmentResponseDto> {
    const existing = await this.prisma.batchCourseAssignment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Batch course assignment with ID ${id} not found`,
      );
    }

    const updated = await this.prisma.batchCourseAssignment.update({
      where: { id },
      data: {
        isCompulsory: dto.isCompulsory,
        displayOrder: dto.displayOrder,
      },
      include: {
        batch: { select: { id: true, name: true } },
        course: {
          select: { id: true, code: true, name: true, creditHours: true },
        },
      },
    });

    return updated;
  }

  /**
   * Delete an assignment.
   */
  async remove(id: string): Promise<void> {
    const existing = await this.prisma.batchCourseAssignment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Batch course assignment with ID ${id} not found`,
      );
    }

    await this.prisma.batchCourseAssignment.delete({
      where: { id },
    });
  }

  /**
   * Remove all courses from a batch/semester.
   */
  async removeAll(query: GetBatchCoursesQueryDto): Promise<{ count: number }> {
    const where: any = { batchId: query.batchId };
    if (query.semesterNumber !== undefined) {
      where.semesterNumber = query.semesterNumber;
    }

    const result = await this.prisma.batchCourseAssignment.deleteMany({
      where,
    });

    return { count: result.count };
  }

  /**
   * Get courses for student enrollment (used by enrollments service).
   * Returns the batch's courses for the given semester, shared across sections.
   */
  async getCoursesForEnrollment(
    batchId: string,
    semesterNumber: number,
  ): Promise<
    Array<{
      id: string;
      code: string;
      name: string;
      creditHours: number;
      isCompulsory: boolean;
    }>
  > {
    const assignments = await this.prisma.batchCourseAssignment.findMany({
      where: {
        batchId,
        semesterNumber,
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
      },
      orderBy: [{ displayOrder: 'asc' }, { course: { code: 'asc' } }],
    });

    return assignments.map((a) => ({
      ...a.course,
      isCompulsory: a.isCompulsory,
    }));
  }
}
