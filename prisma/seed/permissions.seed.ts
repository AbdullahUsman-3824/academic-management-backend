import { PrismaClient } from '../../src/generated/prisma/client';
import { PERMISSIONS } from '../../src/common/constants/permissions';

export async function seedPermissions(prisma: PrismaClient) {
  const permissionNames = Object.values(PERMISSIONS);

  for (const name of permissionNames) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}
