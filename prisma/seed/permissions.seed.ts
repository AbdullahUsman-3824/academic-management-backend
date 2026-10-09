import { PrismaClient } from '../../src/generated/prisma/client';
import { PERMISSIONS } from '../../src/common/constants/permissions';

export async function seedPermissions(prisma: PrismaClient) {
  console.log('🔐 Seeding Permissions...');

  const permissionNames = Object.values(PERMISSIONS);

  for (const name of permissionNames) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log(`   ✓ Created ${permissionNames.length} permissions`);
}
