import { seedPermissions } from './seed/permissions.seed';
import { seedRoles } from './seed/roles.seed';
import { seedRolePermissions } from './seed/role-permissions.seed';
import { seedAdmin } from './seed/admin.seed';

import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding started...\n');

  await seedPermissions(prisma);
  await seedRoles(prisma);
  await seedRolePermissions(prisma);
  await seedAdmin(prisma);

  console.log('\nSeeding completed.');
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
