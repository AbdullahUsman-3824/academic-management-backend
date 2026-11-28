/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-argument */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AllocationsService } from './allocations.service';

describe('AllocationsService', () => {
  const session = { id: 'session-id', name: 'Fall', startDate: new Date(), endDate: new Date() };
  const baseAssignment = {
    id: 'assignment-id',
    batchId: 'batch-id',
    semesterId: 'semester-id',
    course: { id: 'course-id', code: 'CS101', status: 'active', creditHours: 3 },
    semester: { id: 'semester-id', number: 1, maxCredits: 18 },
  };
  const baseSection = {
    id: 'section-id',
    name: 'A',
    batch: { id: 'batch-id', name: 'CS-2024', status: 'ACTIVE', currentSemesterId: 'semester-id' },
  };
  const baseFaculty = {
    id: 'faculty-id',
    firstName: 'Ali',
    middleName: null,
    lastName: 'Khan',
    status: 'active',
  };

  const createFixture = () => {
    const tx: any = {
      academicSession: {
        findFirst: jest.fn().mockResolvedValue(session),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn(),
      },
      batchCourseAssignment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      section: { findUnique: jest.fn() },
      faculty: { findUnique: jest.fn() },
      courseAllocation: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      studentAcademicRecord: { findMany: jest.fn().mockResolvedValue([]) },
      courseEnrollment: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        groupBy: jest.fn(),
      },
      assessment: { count: jest.fn() },
      studentMark: { count: jest.fn() },
      studentCourseResult: { count: jest.fn() },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const prisma: any = {
      batchCourseAssignment: {
        findUnique: jest.fn().mockResolvedValue(baseAssignment),
        findMany: jest.fn(),
      },
      section: { findUnique: jest.fn().mockResolvedValue(baseSection) },
      faculty: { findUnique: jest.fn().mockResolvedValue(baseFaculty) },
      academicSession: tx.academicSession,
      courseAllocation: tx.courseAllocation,
      courseEnrollment: tx.courseEnrollment,
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    const service = new AllocationsService(prisma);
    return { service, tx, prisma };
  };

  it('reactivates an inactive allocation instead of creating a new row', async () => {
    const { service, tx } = createFixture();
    tx.courseAllocation.findUnique
      .mockResolvedValueOnce({ id: 'old-id', status: 'inactive', facultyId: 'old', updatedAt: new Date() });
    tx.courseAllocation.update.mockResolvedValue({
      id: 'old-id',
      status: 'active',
      updatedAt: new Date(),
    });
    const result = await service.create({
      batchCourseAssignmentId: 'assignment-id',
      facultyId: 'faculty-id',
      sectionId: 'section-id',
    });
    expect(result.reactivated).toBe(true);
    expect(tx.courseAllocation.create).not.toHaveBeenCalled();
  });

  it('rejects an active duplicate with ConflictException', async () => {
    const { service, tx } = createFixture();
    tx.courseAllocation.findUnique.mockResolvedValue({
      id: 'old-id',
      status: 'active',
      facultyId: 'old',
      updatedAt: new Date(),
    });
    await expect(service.create({
      batchCourseAssignmentId: 'assignment-id',
      facultyId: 'faculty-id',
      sectionId: 'section-id',
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('enforces the single allocation workload cap', async () => {
    const { service, tx } = createFixture();
    tx.courseAllocation.count.mockResolvedValue(8);
    await expect(service.create({
      batchCourseAssignmentId: 'assignment-id',
      facultyId: 'faculty-id',
      sectionId: 'section-id',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an inactive faculty', async () => {
    const { service, prisma } = createFixture();
    prisma.faculty.findUnique.mockResolvedValue({ ...baseFaculty, status: 'inactive' });
    await expect(service.create({
      batchCourseAssignmentId: 'assignment-id',
      facultyId: 'faculty-id',
      sectionId: 'section-id',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an inactive course', async () => {
    const { service, prisma } = createFixture();
    prisma.batchCourseAssignment.findUnique.mockResolvedValue({
      ...baseAssignment,
      course: { ...baseAssignment.course, status: 'inactive' },
    });
    await expect(service.create({
      batchCourseAssignmentId: 'assignment-id',
      facultyId: 'faculty-id',
      sectionId: 'section-id',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects assignment from another batch', async () => {
    const { service, prisma } = createFixture();
    prisma.batchCourseAssignment.findUnique.mockResolvedValue({
      ...baseAssignment,
      batchId: 'other-batch',
    });
    await expect(service.create({
      batchCourseAssignmentId: 'assignment-id',
      facultyId: 'faculty-id',
      sectionId: 'section-id',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects assignment outside the batch current semester', async () => {
    const { service, prisma } = createFixture();
    prisma.batchCourseAssignment.findUnique.mockResolvedValue({
      ...baseAssignment,
      semesterId: 'other-semester',
    });
    await expect(service.create({
      batchCourseAssignmentId: 'assignment-id',
      facultyId: 'faculty-id',
      sectionId: 'section-id',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bulk reports missing assignment ids', async () => {
    const { service, tx } = createFixture();
    tx.section.findUnique.mockResolvedValue(baseSection);
    tx.faculty.findUnique.mockResolvedValue(baseFaculty);
    tx.batchCourseAssignment.findMany.mockResolvedValue([]);
    await expect(service.bulkCreate({
      assignmentIds: ['missing-id'],
      facultyId: 'faculty-id',
      sectionId: 'section-id',
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks removal when assessments or marks exist', async () => {
    const { service, tx } = createFixture();
    tx.courseAllocation.findUnique.mockResolvedValue({
      id: 'allocation-id',
      batchCourseAssignmentId: 'assignment-id',
      sectionId: 'section-id',
      academicSessionId: 'session-id',
      status: 'active',
    });
    tx.assessment.count.mockResolvedValue(1);
    tx.studentMark.count.mockResolvedValue(0);
    tx.studentCourseResult.count.mockResolvedValue(0);
    await expect(service.remove('allocation-id')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks editing allocations from past sessions', async () => {
    const { service, tx } = createFixture();
    tx.courseAllocation.findUnique.mockResolvedValue({
      id: 'allocation-id',
      facultyId: 'faculty-id',
      batchCourseAssignmentId: 'assignment-id',
      academicSessionId: 'past-session',
      status: 'active',
      batchCourseAssignment: { course: { code: 'CS101' } },
    });
    await expect(service.update('allocation-id', { facultyId: 'new-faculty' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
