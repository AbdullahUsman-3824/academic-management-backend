import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { BatchCourseAssignmentsService } from '../../batch-curriculum/services/batch-course-assignments.service';
import { EnrollmentsService } from './enrollments.service';

describe('EnrollmentsService', () => {
  const createFixture = () => {
    const tx = {
      academicSession: { findFirst: jest.fn() },
      studentAcademicRecord: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      courseAllocation: {
        findFirst: jest.fn<
          Promise<{ id: string } | null>,
          [
            {
              where?: Prisma.CourseAllocationWhereInput;
              select?: Prisma.CourseAllocationSelect;
            },
          ]
        >(),
        findUnique: jest.fn(),
      },
      courseEnrollment: {
        count: jest.fn<
          Promise<number>,
          [{ where: Prisma.CourseEnrollmentWhereInput }]
        >(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const transaction = async <T>(
      callback: (client: Prisma.TransactionClient) => Promise<T>,
    ) => callback(tx as unknown as Prisma.TransactionClient);

    const prisma = {
      ...tx,
      $transaction: jest.fn(transaction),
    };
    const batchCourseService = {
      getCoursesForEnrollment: jest.fn(),
    };
    const service = new EnrollmentsService(
      prisma as unknown as PrismaService,
      batchCourseService as unknown as BatchCourseAssignmentsService,
    );

    return { service, tx, prisma, batchCourseService };
  };

  it('rejects registration finalization below the semester minimum', async () => {
    const { service, tx } = createFixture();
    tx.studentAcademicRecord.findUnique
      .mockResolvedValueOnce({ courseRegistrationFinalizedAt: null })
      .mockResolvedValueOnce({
        semester: { number: 1, minCredits: 12, maxCredits: 21 },
      });
    tx.courseEnrollment.findMany.mockResolvedValue([]);

    await expect(service.finalizeRegistration('record-id')).rejects.toThrow(
      BadRequestException,
    );
    expect(tx.studentAcademicRecord.update).not.toHaveBeenCalled();
  });

  it('finalizes registration when the minimum credit load is met', async () => {
    const { service, tx } = createFixture();
    tx.studentAcademicRecord.findUnique
      .mockResolvedValueOnce({ courseRegistrationFinalizedAt: null })
      .mockResolvedValueOnce({
        semester: { number: 1, minCredits: 12, maxCredits: 21 },
      });
    tx.courseEnrollment.findMany.mockResolvedValue(
      [4, 4, 4].map((creditHours) => ({
        allocation: { batchCourseAssignment: { course: { creditHours } } },
      })),
    );
    tx.studentAcademicRecord.update.mockResolvedValue({});

    const result = await service.finalizeRegistration('record-id');

    expect(result.credits).toBe(12);
    expect(result.minCredits).toBe(12);
    expect(result.courseRegistrationFinalizedAt).toBeInstanceOf(Date);
    expect(tx.studentAcademicRecord.update).toHaveBeenCalledTimes(1);
  });

  it('uses the academic record semester and active allocation for auto-enrollment', async () => {
    const { service, tx, batchCourseService } = createFixture();
    batchCourseService.getCoursesForEnrollment.mockResolvedValue([
      {
        id: 'course-id',
        code: 'LAW101',
        name: 'Law',
        creditHours: 3,
        isCompulsory: true,
      },
    ]);
    tx.studentAcademicRecord.findUnique
      .mockResolvedValueOnce({
        sectionId: 'section-id',
        academicSessionId: 'session-id',
        semesterId: 'semester-id',
        courseRegistrationFinalizedAt: null,
      })
      .mockResolvedValueOnce({
        semester: { number: 2, minCredits: 12, maxCredits: 21 },
      });
    tx.courseEnrollment.findMany.mockResolvedValue([]);
    tx.courseAllocation.findFirst.mockResolvedValue({ id: 'allocation-id' });
    tx.courseEnrollment.create.mockResolvedValue({ id: 'enrollment-id' });

    await service.autoEnrollInBatchCourses(
      'record-id',
      'batch-id',
      2,
      tx as unknown as Prisma.TransactionClient,
    );

    const allocationQuery = tx.courseAllocation.findFirst.mock.calls[0]?.[0];
    expect(allocationQuery?.where).toMatchObject({
      status: 'active',
      batchCourseAssignment: {
        courseId: 'course-id',
        semesterId: 'semester-id',
      },
    });
  });

  it('skips auto-enrollment when it would exceed the semester credit maximum', async () => {
    const { service, tx, batchCourseService } = createFixture();
    batchCourseService.getCoursesForEnrollment.mockResolvedValue([
      {
        id: 'course-id',
        code: 'LAW101',
        name: 'Law',
        creditHours: 3,
        isCompulsory: true,
      },
    ]);
    tx.studentAcademicRecord.findUnique
      .mockResolvedValueOnce({
        sectionId: 'section-id',
        academicSessionId: 'session-id',
        semesterId: 'semester-id',
        courseRegistrationFinalizedAt: null,
      })
      .mockResolvedValueOnce({
        semester: { number: 2, minCredits: 12, maxCredits: 21 },
      });
    tx.courseEnrollment.findMany.mockResolvedValue([
      {
        allocation: {
          batchCourseAssignment: { course: { creditHours: 20 } },
        },
      },
    ]);

    const result = await service.autoEnrollInBatchCourses(
      'record-id',
      'batch-id',
      2,
      tx as unknown as Prisma.TransactionClient,
    );

    expect(result.skipped).toBe(1);
    expect(tx.courseAllocation.findFirst).not.toHaveBeenCalled();
  });

  it('propagates bulk enrollment failures so the transaction can roll back', async () => {
    const { service, tx, prisma } = createFixture();
    tx.studentAcademicRecord.findUnique.mockResolvedValue({
      sectionId: 'section-id',
      academicSessionId: 'session-id',
      semesterId: 'semester-id',
      courseRegistrationFinalizedAt: null,
    });
    tx.courseAllocation.findFirst.mockResolvedValue({ id: 'allocation-id' });
    const createSpy = jest
      .spyOn(service, 'create')
      .mockRejectedValue(new BadRequestException('course failed'));

    await expect(
      service.bulkEnroll({
        studentAcademicRecordId: 'record-id',
        courseIds: ['course-1', 'course-2'],
      }),
    ).rejects.toThrow('course failed');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it('allows enrollment queries to explicitly select a historical session', async () => {
    const { service, tx } = createFixture();
    tx.courseEnrollment.count.mockResolvedValue(0);
    tx.courseEnrollment.findMany.mockResolvedValue([]);

    await service.findAll({ academicSessionId: 'historical-session-id' });

    expect(tx.academicSession.findFirst).not.toHaveBeenCalled();
    const countQuery = tx.courseEnrollment.count.mock.calls[0]?.[0];
    expect(countQuery?.where.studentAcademicRecord).toMatchObject({
      academicSessionId: 'historical-session-id',
    });
  });
});
