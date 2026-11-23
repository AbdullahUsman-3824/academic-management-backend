import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
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

  private static readonly assignmentInclude = {
    batch: { select: { id: true, name: true } },
    course: {
      select: { id: true, code: true, name: true, creditHours: true },
    },
    semester: { select: { id: true, number: true } },
  } satisfies Prisma.BatchCourseAssignmentInclude;

  private mapAssignment(
    assignment: Prisma.BatchCourseAssignmentGetPayload<{
      include: typeof BatchCourseAssignmentsService.assignmentInclude;
    }>,
  ): BatchCourseAssignmentResponseDto {
    return {
      ...assignment,
      semesterNumber: assignment.semester.number,
      batch: assignment.batch,
      course: assignment.course,
    };
  }

  private async resolveSemester(number: number) {
    const semester = await this.prisma.semester.findUnique({
      where: { number },
    });
    if (!semester) {
      throw new NotFoundException(`Semester ${number} not found`);
    }
    return semester;
  }

  /**
   * Assign a single course to a batch/semester.
   * Courses belong to the batch+semester and are shared across all its sections.
   */
  async create(
    dto: CreateBatchCourseAssignmentDto,
  ): Promise<BatchCourseAssignmentResponseDto> {
    const semester = await this.resolveSemester(dto.semesterNumber);
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
        semesterId: semester.id,
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
        semesterId: semester.id,
        isCompulsory: dto.isCompulsory ?? true,
        displayOrder: dto.displayOrder ?? 0,
      },
      include: {
        batch: { select: { id: true, name: true } },
        course: {
          select: { id: true, code: true, name: true, creditHours: true },
        },
        semester: { select: { id: true, number: true } },
      },
    });

    return this.mapAssignment(assignment);
  }

  /**
   * Bulk assign multiple courses to a batch/semester.
   */
  async bulkAssign(dto: BulkAssignCoursesDto): Promise<{ count: number }> {
    const semester = await this.resolveSemester(dto.semesterNumber);
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
        semesterId: semester.id,
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
        semesterId: semester.id,
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
    const where: Prisma.BatchCourseAssignmentWhereInput = {
      batchId: query.batchId,
    };

    if (query.semesterNumber !== undefined) {
      const semester = await this.resolveSemester(query.semesterNumber);
      where.semesterId = semester.id;
    }

    const assignments = await this.prisma.batchCourseAssignment.findMany({
      where,
      include: {
        batch: { select: { id: true, name: true } },
        course: {
          select: { id: true, code: true, name: true, creditHours: true },
        },
        semester: { select: { id: true, number: true } },
      },
      orderBy: [
        { semester: { number: 'asc' } },
        { displayOrder: 'asc' },
        { course: { code: 'asc' } },
      ],
    });

    return assignments.map((assignment) => this.mapAssignment(assignment));
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
        semester: { select: { id: true, number: true } },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Batch course assignment with ID ${id} not found`,
      );
    }

    return this.mapAssignment(assignment);
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
        semester: { select: { id: true, number: true } },
      },
    });

    return this.mapAssignment(updated);
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
    const where: Prisma.BatchCourseAssignmentWhereInput = {
      batchId: query.batchId,
    };
    if (query.semesterNumber !== undefined) {
      const semester = await this.resolveSemester(query.semesterNumber);
      where.semesterId = semester.id;
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
    const semester = await this.resolveSemester(semesterNumber);
    const assignments = await this.prisma.batchCourseAssignment.findMany({
      where: {
        batchId,
        semesterId: semester.id,
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
