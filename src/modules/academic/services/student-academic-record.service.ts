import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SectionService } from './section.service';
import { EnrollmentsService } from '../../coursesManagement/enrollments/service/enrollments.service';
import { Prisma } from '../../../generated/prisma/client';

type Db = PrismaService | Prisma.TransactionClient;

export interface CreateStudentAcademicRecordDto {
  studentId: string;
  batchId: string;
  academicSessionId?: string | null; // optional
  semesterNumber?: number | null; // optional → defaults to 1
  sectionId?: string | null; // optional → auto-balance
}

@Injectable()
export class StudentAcademicRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sectionService: SectionService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  // ─────────────────────────────────────────────
  // Create academic record for a student
  // ─────────────────────────────────────────────
  async createRecord(
    dto: CreateStudentAcademicRecordDto,
    client: Db = this.prisma,
  ) {
    const { studentId, batchId, sectionId } = dto;

    let academicSessionId = dto.academicSessionId;
    const semesterNumber = dto.semesterNumber ?? 1;

    // ── Basic validations ──────────────────────
    if (semesterNumber < 1 || semesterNumber > 12) {
      throw new BadRequestException('semesterNumber must be between 1 and 12');
    }

    // Student exists?
    const student = await client.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    // Batch exists + active?
    const batch = await client.batch.findUnique({
      where: { id: batchId },
      select: { id: true, status: true },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.status !== 'ACTIVE') {
      throw new BadRequestException('Batch is not active');
    }

    // ── Resolve Academic Session ───────────────
    if (!academicSessionId) {
      const activeSession = await client.academicSession.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true },
        orderBy: { startDate: 'desc' },
      });

      if (!activeSession) {
        throw new BadRequestException(
          'No ACTIVE academic session found. Please provide academicSessionId.',
        );
      }
      academicSessionId = activeSession.id;
    } else {
      const session = await client.academicSession.findUnique({
        where: { id: academicSessionId },
        select: { id: true },
      });
      if (!session) {
        throw new NotFoundException('Academic session not found');
      }
    }

    // Already has a record for this session?
    const existing = await client.studentAcademicRecord.findUnique({
      where: {
        studentId_academicSessionId: {
          studentId,
          academicSessionId,
        },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Student already has an academic record for this session',
      );
    }

    // ── Get the section (auto-create "A" if needed) ──
    const suggested = await this.sectionService.suggestSection(
      batchId,
      sectionId,
      client,
    );

    // ── Create the record ──────────────────────
    try {
      // Resolve semester ID from semester number
      const semester = await client.semester.findUnique({
        where: { number: semesterNumber },
        select: { id: true },
      });

      if (!semester) {
        throw new BadRequestException(
          `Semester ${semesterNumber} not found in database`,
        );
      }

      const record = await client.studentAcademicRecord.create({
        data: {
          studentId,
          batchId,
          academicSessionId,
          semesterNumber,
          semesterId: semester.id, // ADD: Required field
          sectionId: suggested.id,
          status: 'ENROLLED',
        },
        include: {
          section: {
            select: { id: true, name: true },
          },
          academicSession: {
            select: { id: true, name: true },
          },
        },
      });

      // ── AUTO-ENROLL in batch courses ──────────
      let enrollmentResult: {
        created: Array<{
          courseId: string;
          courseCode: string;
          courseName: string;
          creditHours: number;
        }>;
        skipped: number;
        errors: Array<{ courseId: string; error: string }>;
      } = {
        created: [],
        skipped: 0,
        errors: [],
      };

      try {
        console.log(
          `[AUTO-ENROLL] Starting for student ${studentId}, batch ${batchId}, semester ${semesterNumber}`,
        );
        enrollmentResult = await this.enrollmentsService.autoEnrollInBatchCourses(
          record.id,
          batchId,
          semesterNumber,
          client,
        );
        console.log(
          `[AUTO-ENROLL] Complete: ${enrollmentResult.created.length} courses enrolled, ${enrollmentResult.skipped} skipped, ${enrollmentResult.errors.length} errors`,
        );
      } catch (enrollError: any) {
        console.error('[AUTO-ENROLL] Failed:', enrollError.message);
        // Don't fail the student creation if enrollment fails
        enrollmentResult.errors.push({
          courseId: 'SYSTEM',
          error: enrollError.message,
        });
      }

      return {
        message: 'Student academic record created successfully',
        record: {
          id: record.id,
          studentId: record.studentId,
          batchId: record.batchId,
          academicSessionId: record.academicSessionId,
          semesterNumber: record.semesterNumber,
          sectionId: record.sectionId,
          sectionName: record.section?.name,
          status: record.status,
          sectionReason: suggested.reason,
        },
        enrollment: {
          coursesEnrolled: enrollmentResult.created.length,
          coursesSkipped: enrollmentResult.skipped,
          errors: enrollmentResult.errors,
          details: enrollmentResult.created,
        },
      };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Student already has an academic record for this session',
        );
      }
      throw e;
    }
  }
}
