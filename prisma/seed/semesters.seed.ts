import { PrismaClient } from '../../src/generated/prisma/client.js';

export async function seedSemesters(prisma: PrismaClient) {
  console.log('🎓 Seeding Semesters...');

  const semesters = [
    {
      number: 1,
      name: 'First Semester',
      displayName: 'Semester 1',
      minCredits: 12,
      maxCredits: 21,
      isActive: true,
    },
    {
      number: 2,
      name: 'Second Semester',
      displayName: 'Semester 2',
      minCredits: 12,
      maxCredits: 21,
      isActive: true,
    },
    {
      number: 3,
      name: 'Third Semester',
      displayName: 'Semester 3',
      minCredits: 12,
      maxCredits: 21,
      isActive: true,
    },
    {
      number: 4,
      name: 'Fourth Semester',
      displayName: 'Semester 4',
      minCredits: 12,
      maxCredits: 21,
      isActive: true,
    },
    {
      number: 5,
      name: 'Fifth Semester',
      displayName: 'Semester 5',
      minCredits: 12,
      maxCredits: 21,
      isActive: true,
    },
    {
      number: 6,
      name: 'Sixth Semester',
      displayName: 'Semester 6',
      minCredits: 12,
      maxCredits: 21,
      isActive: true,
    },
    {
      number: 7,
      name: 'Seventh Semester',
      displayName: 'Semester 7',
      minCredits: 12,
      maxCredits: 21,
      isActive: true,
    },
    {
      number: 8,
      name: 'Eighth Semester',
      displayName: 'Semester 8',
      minCredits: 12,
      maxCredits: 21,
      isActive: true,
    },
  ];

  for (const semester of semesters) {
    await prisma.semester.upsert({
      where: { number: semester.number },
      update: semester,
      create: semester,
    });
  }

  console.log(`   ✓ Created ${semesters.length} semesters`);
}
