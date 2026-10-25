import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

import { seedPermissions } from './seed/permissions.seed';
import { seedRoles } from './seed/roles.seed';
import { seedRolePermissions } from './seed/role-permissions.seed';
import { seedAdmin } from './seed/admin.seed';
import { seedSemesters } from './seed/semesters.seed';
import { seedAssessmentCategories } from './seed/assessment-categories.seed';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...\n');

  await seedPermissions(prisma);
  await seedRoles(prisma);
  await seedRolePermissions(prisma);
  await seedAdmin(prisma);
  await seedSemesters(prisma);
  await seedAssessmentCategories(prisma);

  console.log('\n✅ Database seeding completed successfully.');
}

main()
  .catch((error) => {
    console.error('\n❌ Database seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
