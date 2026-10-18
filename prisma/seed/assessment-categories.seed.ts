import { PrismaClient } from '../../src/generated/prisma/client';

export async function seedAssessmentCategories(prisma: PrismaClient) {
  console.log('Seeding assessment categories...');

  const categories = [
    { name: 'Quiz', weightage: 10, displayOrder: 1 },
    { name: 'Assignment', weightage: 15, displayOrder: 2 },
    { name: 'Presentation', weightage: 10, displayOrder: 3 },
    { name: 'Attendance', weightage: 5, displayOrder: 4 },
    { name: 'Mid-term', weightage: 30, displayOrder: 5 },
    { name: 'Final', weightage: 50, displayOrder: 6 },
    { name: 'Others', weightage: 0, displayOrder: 7 },
  ];

  for (const category of categories) {
    // Check if category already exists
    const existing = await prisma.assessmentCategory.findFirst({
      where: { name: category.name },
    });

    if (!existing) {
      await prisma.assessmentCategory.create({
        data: category,
      });
    }
  }

  console.log('✓ Assessment categories seeded');
}
