import { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEMESTERS } from '../../src/common/constants/semesters.js';

export async function seedSemesters(prisma: PrismaClient) {
  console.log('🎓 Seeding Semesters...');

  for (const semester of SEMESTERS) {
    await prisma.semester.upsert({
      where: { number: semester.number },
      update: semester,
      create: semester,
    });
  }

  console.log(`   ✓ Created ${SEMESTERS.length} semesters`);
}
