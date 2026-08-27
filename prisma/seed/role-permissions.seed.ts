import { PrismaClient } from '../../src/generated/prisma/client';
import { ROLES } from '../../src/common/constants/roles';
import { ROLE_PERMISSION_MAP } from '../../src/common/constants/role-permission-map';

export async function seedRolePermissions(prisma: PrismaClient) {
  const allPermissions = await prisma.permission.findMany();
  const allRoles = await prisma.role.findMany();

  const roleByName = new Map(allRoles.map((r) => [r.name, r]));
  const permissionByName = new Map(allPermissions.map((p) => [p.name, p]));

  let count = 0;

  // Admin gets everything
  const adminRole = roleByName.get(ROLES.ADMIN);
  if (!adminRole)
    throw new Error('ADMIN role not found — did seedRoles run first?');

  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
    count++;
  }

  // Everyone else gets their mapped subset
  for (const [roleName, permissionNames] of Object.entries(
    ROLE_PERMISSION_MAP,
  )) {
    const role = roleByName.get(roleName);
    if (!role)
      throw new Error(
        `Role "${roleName}" not found — did seedRoles run first?`,
      );

    for (const permName of permissionNames) {
      const perm = permissionByName.get(permName);
      if (!perm)
        throw new Error(
          `Permission "${permName}" not found — check PERMISSIONS constant`,
        );

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
      count++;
    }
  }

  console.log(`Seeded ${count} role-permission mappings`);
}
