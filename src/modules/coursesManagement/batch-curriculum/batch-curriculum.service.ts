import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import {
  CopyCurriculumPreviewQueryDto,
  SaveCurriculumDto,
} from './batch-curriculum.dto';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class BatchCurriculumService {
  constructor(private readonly prisma: PrismaService) {}

  private maxSemesterNumber(programDuration: number): number {
    return programDuration * 2;
  }

  private async getApplicableSemesters(
    client: TxClient | PrismaService,
    batch: { programDuration: number },
  ) {
    return client.semester.findMany({
      where: {
        isActive: true,
        number: { lte: this.maxSemesterNumber(batch.programDuration), gte: 1 },
      },
      orderBy: { number: 'asc' },
    });
  }

  private async mapCurriculum(
    client: TxClient | PrismaService,
    batch: { id: string; name: string; programDuration: number },
  ) {
    const semesters = await this.getApplicableSemesters(client, batch);
    const semesterIds = semesters.map((semester) => semester.id);
    const [assignments, batchSemesters] = await Promise.all([
      client.batchCourseAssignment.findMany({
        where: { batchId: batch.id, semesterId: { in: semesterIds } },
        include: {
          course: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              creditHours: true,
            },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { course: { code: 'asc' } }],
      }),
      client.batchSemester.findMany({
        where: { batchId: batch.id, semesterId: { in: semesterIds } },
        select: { semesterId: true, status: true, lockedAt: true },
      }),
    ]);

    const lockBySemester = new Map(
      batchSemesters.map((row) => [
        row.semesterId,
        row.lockedAt !== null ||
          row.status === 'ACTIVE' ||
          row.status === 'COMPLETED',
      ]),
    );

    return {
      batch: { id: batch.id, name: batch.name },
      semesters: semesters.map((semester) => {
        const courses = assignments
          .filter((assignment) => assignment.semesterId === semester.id)
          .map((assignment) => ({
            assignmentId: assignment.id,
            courseId: assignment.course.id,
            code: assignment.course.code,
            name: assignment.course.name,
            description: assignment.course.description,
            creditHours: assignment.course.creditHours,
            displayOrder: assignment.displayOrder,
          }));

        return {
          semesterId: semester.id,
          semesterNumber: semester.number,
          minCredits: semester.minCredits,
          maxCredits: semester.maxCredits,
          isLocked: lockBySemester.get(semester.id) ?? false,
          courses,
          totalCourses: courses.length,
          totalCreditHours: courses.reduce(
            (total, course) => total + course.creditHours,
            0,
          ),
        };
      }),
    };
  }

  async getCurriculum(batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: { id: true, name: true, programDuration: true },
    });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }
    return this.mapCurriculum(this.prisma, batch);
  }

  async getCopyPreview(
    targetBatchId: string,
    query: CopyCurriculumPreviewQueryDto,
  ) {
    const [target, source] = await Promise.all([
      this.prisma.batch.findUnique({
        where: { id: targetBatchId },
        select: { id: true, name: true, programDuration: true },
      }),
      this.prisma.batch.findUnique({
        where: { id: query.sourceBatchId },
        select: { id: true, name: true, programDuration: true },
      }),
    ]);

    if (!target) {
      throw new NotFoundException(`Batch with ID ${targetBatchId} not found`);
    }
    if (!source) {
      throw new NotFoundException(
        `Batch with ID ${query.sourceBatchId} not found`,
      );
    }
    if (target.id === source.id) {
      throw new BadRequestException(
        'Source and target batches must be different',
      );
    }

    if (query.semesterId) {
      const [targetSemester, sourceSemester] = await Promise.all([
        this.prisma.semester.findUnique({ where: { id: query.semesterId } }),
        this.prisma.semester.findUnique({ where: { id: query.semesterId } }),
      ]);

      if (!targetSemester || !sourceSemester) {
        throw new NotFoundException(
          `Semester with ID ${query.semesterId} not found`,
        );
      }
      if (
        targetSemester.number >
          this.maxSemesterNumber(target.programDuration) ||
        sourceSemester.number >
          this.maxSemesterNumber(source.programDuration) ||
        !targetSemester.isActive ||
        !sourceSemester.isActive
      ) {
        throw new BadRequestException(
          'Selected semester is not applicable to both batches',
        );
      }

      const curriculum = await this.mapCurriculum(this.prisma, source);
      return {
        sourceBatch: curriculum.batch,
        semesters: curriculum.semesters.filter(
          (semester) => semester.semesterId === query.semesterId,
        ),
      };
    }

    const curriculum = await this.mapCurriculum(this.prisma, source);
    return {
      sourceBatch: curriculum.batch,
      semesters: curriculum.semesters,
    };
  }

  async saveCurriculum(batchId: string, dto: SaveCurriculumDto) {
    await this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        select: { id: true, name: true, programDuration: true },
      });
      if (!batch) {
        throw new NotFoundException(`Batch with ID ${batchId} not found`);
      }

      const semesterIds = dto.semesters.map((entry) => entry.semesterId);
      if (new Set(semesterIds).size !== semesterIds.length) {
        throw new BadRequestException(
          'Duplicate semester entries are not allowed',
        );
      }

      const courseIds = dto.semesters.flatMap((entry) =>
        entry.courses.map((course) => course.courseId),
      );
      const submittedSemesterCoursePairs = dto.semesters.flatMap((entry) =>
        entry.courses.map((course) => `${entry.semesterId}:${course.courseId}`),
      );
      if (
        new Set(submittedSemesterCoursePairs).size !==
        submittedSemesterCoursePairs.length
      ) {
        throw new BadRequestException(
          'Duplicate course assignments within a semester are not allowed',
        );
      }

      const semesters = await tx.semester.findMany({
        where: { id: { in: semesterIds } },
      });
      if (semesters.length !== semesterIds.length) {
        throw new BadRequestException('One or more semester IDs are invalid');
      }
      for (const semester of semesters) {
        if (
          !semester.isActive ||
          semester.number < 1 ||
          semester.number > this.maxSemesterNumber(batch.programDuration)
        ) {
          throw new BadRequestException(
            `Semester ${semester.number} is not applicable to batch ${batch.name}`,
          );
        }
      }

      const courses = await tx.course.findMany({
        where: { id: { in: courseIds } },
      });
      if (courses.length !== new Set(courseIds).size) {
        throw new BadRequestException('One or more course IDs are invalid');
      }
      const courseById = new Map(courses.map((course) => [course.id, course]));

      for (const entry of dto.semesters) {
        const semester = semesters.find(
          (item) => item.id === entry.semesterId,
        )!;
        const displayOrders = entry.courses.map(
          (course) => course.displayOrder,
        );
        if (new Set(displayOrders).size !== displayOrders.length) {
          throw new BadRequestException(
            `Duplicate display orders are not allowed in semester ${semester.number}`,
          );
        }
        const totalCredits = entry.courses.reduce(
          (total, course) =>
            total + (courseById.get(course.courseId)?.creditHours ?? 0),
          0,
        );
        if (
          totalCredits < semester.minCredits ||
          totalCredits > semester.maxCredits
        ) {
          throw new BadRequestException(
            `Semester ${semester.number} credits must be between ${semester.minCredits} and ${semester.maxCredits}`,
          );
        }
      }

      const applicableSemesters = await this.getApplicableSemesters(tx, batch);
      const applicableIds = applicableSemesters.map((semester) => semester.id);
      const batchSemesters = await tx.batchSemester.findMany({
        where: { batchId: batch.id, semesterId: { in: applicableIds } },
        select: { semesterId: true, status: true, lockedAt: true },
      });
      const lockBySemester = new Map(
        batchSemesters.map((row) => [
          row.semesterId,
          row.lockedAt !== null ||
            row.status === 'ACTIVE' ||
            row.status === 'COMPLETED',
        ]),
      );

      const existing = await tx.batchCourseAssignment.findMany({
        where: { batchId: batch.id, semesterId: { in: applicableIds } },
        include: {
          _count: { select: { allocations: true } },
        },
      });

      const finalBySemester = new Map<
        string,
        Array<{ courseId: string; displayOrder: number }>
      >();
      for (const entry of dto.semesters) {
        finalBySemester.set(
          entry.semesterId,
          entry.courses.map((course) => ({
            courseId: course.courseId,
            displayOrder: course.displayOrder,
          })),
        );
      }

      for (const [semesterId, finalCourses] of finalBySemester) {
        if (!lockBySemester.get(semesterId)) continue;
        const existingCourses = existing
          .filter((assignment) => assignment.semesterId === semesterId)
          .map((assignment) => ({
            courseId: assignment.courseId,
            displayOrder: assignment.displayOrder,
          }))
          .sort((a, b) => a.displayOrder - b.displayOrder);
        const submittedCourses = [...finalCourses].sort(
          (a, b) => a.displayOrder - b.displayOrder,
        );
        const unchanged =
          existingCourses.length === submittedCourses.length &&
          existingCourses.every(
            (course, index) =>
              course.courseId === submittedCourses[index].courseId &&
              course.displayOrder === submittedCourses[index].displayOrder,
          );
        if (!unchanged) {
          throw new ConflictException(
            'Cannot modify a locked semester curriculum',
          );
        }
      }

      for (const assignment of existing) {
        const finalCourses = finalBySemester.get(assignment.semesterId);
        if (!finalCourses) continue;
        const stillPresent = finalCourses.some(
          (course) => course.courseId === assignment.courseId,
        );
        if (!stillPresent && assignment._count.allocations > 0) {
          throw new ConflictException(
            `Cannot remove course assignment ${assignment.id}: it is referenced by course allocations`,
          );
        }
      }

      for (const assignment of existing) {
        const finalCourses = finalBySemester.get(assignment.semesterId);
        if (!finalCourses) continue;
        const finalCourse = finalCourses.find(
          (course) => course.courseId === assignment.courseId,
        );
        if (!finalCourse) {
          await tx.batchCourseAssignment.delete({
            where: { id: assignment.id },
          });
        } else if (assignment.displayOrder !== finalCourse.displayOrder) {
          await tx.batchCourseAssignment.update({
            where: { id: assignment.id },
            data: { displayOrder: finalCourse.displayOrder },
          });
        }
      }

      for (const entry of dto.semesters) {
        for (const course of entry.courses) {
          const existingAssignment = existing.find(
            (assignment) =>
              assignment.semesterId === entry.semesterId &&
              assignment.courseId === course.courseId,
          );
          if (!existingAssignment) {
            await tx.batchCourseAssignment.create({
              data: {
                batchId: batch.id,
                semesterId: entry.semesterId,
                courseId: course.courseId,
                displayOrder: course.displayOrder,
              },
            });
          }
        }
      }
    });

    return this.getCurriculum(batchId);
  }
}
