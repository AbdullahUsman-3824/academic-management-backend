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
   * Assign a single course to a batch/semester level
   */
  async create(
    dto: CreateBatchCourseAssignmentDto,
  ): Promise<BatchCourseAssignmentResponseDto> {
    // Validate batch exists
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
    });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${dto.batchId} not found`);
    }

    // Validate section belongs to batch (if provided)
    if (dto.sectionId) {
      const section = await this.prisma.section.findFirst({
        where: {
          id: dto.sectionId,
          batchId: dto.batchId,
        },
      });
      if (!section) {
        throw new BadRequestException(
          `Section ${dto.sectionId} does not belong to batch ${dto.batchId}`,
        );
      }
    }

    // Validate course exists
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${dto.courseId} not found`);
    }

    // Check for duplicate
    const existing = await this.prisma.batchCourseAssignment.findFirst({
      where: {
        batchId: dto.batchId,
        sectionId: dto.sectionId || null,
        courseId: dto.courseId,
        semesterNumber: dto.semesterNumber,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Course ${course.code} is already assigned to this batch/section/semester`,
      );
    }

    // Create assignment
    const assignment = await this.prisma.batchCourseAssignment.create({
      data: {
        batchId: dto.batchId,
        sectionId: dto.sectionId,
        courseId: dto.courseId,
        semesterNumber: dto.semesterNumber,
        isCompulsory: dto.isCompulsory ?? true,
        displayOrder: dto.displayOrder ?? 0,
      },
      include: {
        batch: {
          select: { id: true, name: true },
        },
        section: {
          select: { id: true, name: true },
        },
        course: {
          select: { id: true, code: true, name: true, creditHours: true },
        },
      },
    });

    return assignment;
  }

  /**
   * Bulk assign multiple courses to a batch/semester level
   */
  async bulkAssign(dto: BulkAssignCoursesDto): Promise<{ count: number }> {
    // Validate batch
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
    });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${dto.batchId} not found`);
    }

    // Validate section (if provided)
    if (dto.sectionId) {
      const section = await this.prisma.section.findFirst({
        where: {
          id: dto.sectionId,
          batchId: dto.batchId,
        },
      });
      if (!section) {
        throw new BadRequestException(
          `Section ${dto.sectionId} does not belong to batch ${dto.batchId}`,
        );
      }
    }

    // Validate all courses exist
    const courses = await this.prisma.course.findMany({
      where: { id: { in: dto.courseIds } },
    });
    if (courses.length !== dto.courseIds.length) {
      throw new BadRequestException('One or more courses not found');
    }

    // Get existing assignments to avoid duplicates
    const existing = await this.prisma.batchCourseAssignment.findMany({
      where: {
        batchId: dto.batchId,
        sectionId: dto.sectionId || null,
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

    // Bulk create assignments
    await this.prisma.batchCourseAssignment.createMany({
      data: newCourseIds.map((courseId, index) => ({
        batchId: dto.batchId,
        sectionId: dto.sectionId,
        courseId,
        semesterNumber: dto.semesterNumber,
        isCompulsory: dto.isCompulsory ?? true,
        displayOrder: index,
      })),
    });

    return { count: newCourseIds.length };
  }

  /**
   * Get courses assigned to a batch/semester
   */
  async findAll(
    query: GetBatchCoursesQueryDto,
  ): Promise<BatchCourseAssignmentResponseDto[]> {
    const where: any = {
      batchId: query.batchId,
    };

    // Section filtering logic:
    // - If sectionId provided: show batch-wide (null) OR section-specific courses
    // - If no sectionId: show only batch-wide (null) courses
    if (query.sectionId !== undefined) {
      where.OR = [
        { sectionId: null }, // Batch-wide courses
        { sectionId: query.sectionId }, // Section-specific courses
      ];
    } else {
      where.sectionId = null; // Only batch-wide courses
    }

    // Only filter by semesterNumber if provided
    if (query.semesterNumber !== undefined) {
      where.semesterNumber = query.semesterNumber;
    }

    const assignments = await this.prisma.batchCourseAssignment.findMany({
      where,
      include: {
        batch: {
          select: { id: true, name: true },
        },
        section: {
          select: { id: true, name: true },
        },
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
   * Get a single assignment
   */
  async findOne(id: string): Promise<BatchCourseAssignmentResponseDto> {
    const assignment = await this.prisma.batchCourseAssignment.findUnique({
      where: { id },
      include: {
        batch: {
          select: { id: true, name: true },
        },
        section: {
          select: { id: true, name: true },
        },
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
   * Update an assignment
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
        batch: {
          select: { id: true, name: true },
        },
        section: {
          select: { id: true, name: true },
        },
        course: {
          select: { id: true, code: true, name: true, creditHours: true },
        },
      },
    });

    return updated;
  }

  /**
   * Delete an assignment
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
   * Remove all courses from a batch/semester
   */
  async removeAll(query: GetBatchCoursesQueryDto): Promise<{ count: number }> {
    const result = await this.prisma.batchCourseAssignment.deleteMany({
      where: {
        batchId: query.batchId,
        sectionId: query.sectionId,
        semesterNumber: query.semesterNumber,
      },
    });

    return { count: result.count };
  }

  /**
   * Get courses for student enrollment
   * (Used by enrollments service)
   */
  async getCoursesForEnrollment(
    batchId: string,
    semesterNumber: number,
    sectionId?: string,
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
        sectionId: sectionId || null,
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

  /**
   * Preview what courses will be copied from semester_courses template
   * for a SPECIFIC semester
   */
  async previewTemplateCopy(batchId: string, semesterNumber: number, sectionId?: string) {
    // Validate batch exists
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
    });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    // Get semester courses ONLY for the selected semester
    const semesterCourses = await this.prisma.semesterCourse.findMany({
      where: {
        semester: {
          number: semesterNumber, // FILTER by specific semester
        },
      },
      include: {
        semester: {
          select: { id: true, number: true, displayName: true },
        },
        course: {
          select: { id: true, code: true, name: true, creditHours: true },
        },
      },
      orderBy: [{ displayOrder: 'asc' }],
    });

    // Get existing batch assignments for THIS semester and section
    const existingAssignments = await this.prisma.batchCourseAssignment.findMany({
      where: {
        batchId,
        semesterNumber, // Check specific semester
        sectionId: sectionId || null,
      },
      select: {
        courseId: true,
      },
    });

    const existingCourseIds = new Set(existingAssignments.map(a => a.courseId));

    // Mark which are new vs existing
    const preview = semesterCourses.map((sc) => ({
      semesterNumber: sc.semester.number,
      semesterName: sc.semester.displayName,
      courseId: sc.course.id,
      courseCode: sc.course.code,
      courseName: sc.course.name,
      creditHours: sc.course.creditHours,
      isCompulsory: sc.isCompulsory,
      displayOrder: sc.displayOrder,
      alreadyAssigned: existingCourseIds.has(sc.course.id), // Check by courseId only
    }));

    const summary = {
      totalCourses: semesterCourses.length,
      newCourses: preview.filter(p => !p.alreadyAssigned).length,
      existingCourses: preview.filter(p => p.alreadyAssigned).length,
    };

    return { preview, summary };
  }

  /**
   * Copy courses from semester_courses template to a batch
   * for a SPECIFIC semester
   */
  async copyFromTemplate(
    batchId: string, 
    semesterNumber: number,
    sectionId?: string
  ): Promise<{ count: number }> {
    // Validate batch exists
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
    });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    // Validate section (if provided)
    if (sectionId) {
      const section = await this.prisma.section.findFirst({
        where: {
          id: sectionId,
          batchId: batchId,
        },
      });
      if (!section) {
        throw new BadRequestException(
          `Section ${sectionId} does not belong to batch ${batchId}`,
        );
      }
    }

    // Get semester courses ONLY for the selected semester
    const semesterCourses = await this.prisma.semesterCourse.findMany({
      where: {
        semester: {
          number: semesterNumber, // FILTER by specific semester
        },
      },
      include: {
        semester: {
          select: { number: true },
        },
      },
    });

    if (semesterCourses.length === 0) {
      throw new BadRequestException(
        `No courses found in semester ${semesterNumber} template. Please set up semester courses first.`,
      );
    }

    // Get existing assignments for THIS semester to avoid duplicates
    const existingAssignments = await this.prisma.batchCourseAssignment.findMany({
      where: {
        batchId,
        semesterNumber, // Check specific semester
        sectionId: sectionId || null,
      },
      select: {
        courseId: true,
      },
    });

    const existingCourseIds = new Set(existingAssignments.map(a => a.courseId));

    // Filter out courses that are already assigned
    const coursesToCopy = semesterCourses.filter(
      sc => !existingCourseIds.has(sc.courseId)
    );

    if (coursesToCopy.length === 0) {
      return { count: 0 };
    }

    // Bulk create batch course assignments
    await this.prisma.batchCourseAssignment.createMany({
      data: coursesToCopy.map((sc) => ({
        batchId,
        sectionId,
        courseId: sc.courseId,
        semesterNumber, // Use the selected semester
        isCompulsory: sc.isCompulsory,
        displayOrder: sc.displayOrder,
      })),
    });

    return { count: coursesToCopy.length };
  }
}
