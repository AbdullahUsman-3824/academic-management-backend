import * as argon2 from 'argon2';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { ROLES } from '../../src/common/constants/roles.js';

export async function seedAdmin(prisma: PrismaClient) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error('ADMIN_USERNAME / ADMIN_PASSWORD not set in env');
  }

  const passwordHash = await argon2.hash(password);
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: ROLES.ADMIN },
  });

  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, roleId: adminRole.id },
    create: { username, passwordHash, roleId: adminRole.id },
  });
}
