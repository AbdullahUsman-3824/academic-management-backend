import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  CreateEnrollmentDto,
  UpdateEnrollmentStatusDto,
  BulkEnrollDto,
} from '../dto/enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEnrollmentDto) {
    // Verify student academic record exists
    const studentRecord = await this.prisma.studentAcademicRecord.findUnique({
      where: { id: dto.studentAcademicRecordId },
    });
    if (!studentRecord) {
      throw new NotFoundException('Student academic record not found');
    }

    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    try {
      return await this.prisma.courseEnrollment.create({
        data: {
          studentAcademicRecordId: dto.studentAcademicRecordId,
          courseId: dto.courseId,
          isExtra: dto.isExtra ?? false,
          status: 'enrolled',
        },
        include: {
          course: true,
          studentAcademicRecord: {
            include: {
              student: {
                select: {
                  id: true,
                  stdRegNumber: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Student is already enrolled in this course',
        );
      }
      throw error;
    }
  }

  async bulkEnroll(dto: BulkEnrollDto) {
    const results: any[] = [];
    const errors: Array<{ courseId: string; error: string }> = [];

    for (const courseId of dto.courseIds) {
      try {
        const enrollment = await this.create({
          studentAcademicRecordId: dto.studentAcademicRecordId,
          courseId,
          isExtra: dto.isExtra,
        });
        results.push(enrollment);
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
        enrolled: results.length,
        failed: errors.length,
      },
    };
  }

  async findAll(filters?: {
    studentId?: string;
    studentAcademicRecordId?: string;
    courseId?: string;
    status?: string;
  }) {
    return this.prisma.courseEnrollment.findMany({
      where: {
        studentAcademicRecordId: filters?.studentAcademicRecordId,
        courseId: filters?.courseId,
        status: filters?.status,
        ...(filters?.studentId && {
          studentAcademicRecord: {
            studentId: filters.studentId,
          },
        }),
      },
      include: {
        course: true,
        studentAcademicRecord: {
          include: {
            student: {
              select: {
                id: true,
                stdRegNumber: true,
                firstName: true,
                lastName: true,
              },
            },
            academicSession: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id },
      include: {
        course: true,
        studentAcademicRecord: {
          include: {
            student: true,
            academicSession: true,
            section: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return enrollment;
  }

  async findByStudent(studentId: string, academicSessionId?: string) {
    return this.prisma.courseEnrollment.findMany({
      where: {
        studentAcademicRecord: {
          studentId,
          ...(academicSessionId && { academicSessionId }),
        },
      },
      include: {
        course: true,
        studentAcademicRecord: {
          include: {
            academicSession: true,
            section: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateStatus(id: string, dto: UpdateEnrollmentStatusDto) {
    const enrollment = await this.findOne(id);

    // Validate status transitions
    if (enrollment.status === 'completed' && dto.status !== 'reappear') {
      throw new BadRequestException(
        'Cannot change status of completed enrollment except to reappear',
      );
    }

    return this.prisma.courseEnrollment.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === 'dropped' && { droppedAt: new Date() }),
      },
      include: {
        course: true,
        studentAcademicRecord: {
          include: {
            student: {
              select: {
                id: true,
                stdRegNumber: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  async drop(id: string) {
    return this.updateStatus(id, { status: 'dropped' });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.courseEnrollment.delete({ where: { id } });
    return { id };
  }

  async getEnrollmentStats(studentAcademicRecordId: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { studentAcademicRecordId },
      include: {
        course: true,
      },
    });

    const totalCreditHours = enrollments.reduce(
      (sum, e) => sum + e.course.creditHours,
      0,
    );

    const stats = {
      total: enrollments.length,
      enrolled: enrollments.filter((e) => e.status === 'enrolled').length,
      dropped: enrollments.filter((e) => e.status === 'dropped').length,
      completed: enrollments.filter((e) => e.status === 'completed').length,
      failed: enrollments.filter((e) => e.status === 'failed').length,
      reappear: enrollments.filter((e) => e.status === 'reappear').length,
      totalCreditHours,
    };

    return stats;
  }
}
