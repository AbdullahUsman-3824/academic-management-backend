import { PrismaClient } from '../../src/generated/prisma/client';
import { ROLES } from '../../src/common/constants/roles';

export async function seedRoles(prisma: PrismaClient) {
  const roles = Object.values(ROLES);

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log(`Seeded ${roles.length} roles`);
}
