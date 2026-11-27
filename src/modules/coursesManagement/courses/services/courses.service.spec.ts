import { PrismaService } from '../../../../database/prisma.service';
import { CoursesService } from './courses.service';

describe('CoursesService', () => {
  it('returns assignment usage counts and zero for unused courses', async () => {
    const courses = [
      { id: 'course-1', code: 'CS101', name: 'Programming', creditHours: 3 },
      { id: 'course-2', code: 'CS102', name: 'Data Structures', creditHours: 3 },
    ];
    const prisma = {
      course: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue([courses, courses.length]),
      batchCourseAssignment: {
        groupBy: jest.fn().mockResolvedValue([
          {
            courseId: 'course-1',
            _count: { batchId: 3 },
          },
        ]),
      },
    };
    const service = new CoursesService(prisma as unknown as PrismaService);

    const result = await service.findAll({});

    expect(result.data).toEqual([
      { ...courses[0], usageCount: 3 },
      { ...courses[1], usageCount: 0 },
    ]);
    expect(prisma.batchCourseAssignment.groupBy).toHaveBeenCalledWith({
      by: ['courseId'],
      where: { courseId: { in: ['course-1', 'course-2'] } },
      _count: { batchId: true },
    });
  });

  it('returns the assignment usage count for a single course', async () => {
    const course = {
      id: 'course-1',
      code: 'CS101',
      name: 'Programming',
      creditHours: 3,
    };
    const prisma = {
      course: {
        findUnique: jest.fn().mockResolvedValue(course),
      },
      batchCourseAssignment: {
        groupBy: jest.fn().mockResolvedValue([
          {
            courseId: 'course-1',
            _count: { batchId: 2 },
          },
        ]),
      },
    };
    const service = new CoursesService(prisma as unknown as PrismaService);

    await expect(service.findOne(course.id)).resolves.toEqual({
      ...course,
      usageCount: 2,
    });
    expect(prisma.batchCourseAssignment.groupBy).toHaveBeenCalledWith({
      by: ['courseId'],
      where: { courseId: course.id },
      _count: { batchId: true },
    });
  });
});
