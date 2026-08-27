import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Permission } from '../../../generated/prisma/client.js';

@Injectable()
export class RolePermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assign a permission to a role.
   * Throws ConflictException if the mapping already exists.
   */
  async assignPermission(
    roleId: number,
    permissionId: number,
  ): Promise<void> {
    const existing = await this.prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId } },
    });

    if (existing) {
      throw new ConflictException(
        `Permission ${permissionId} is already assigned to role ${roleId}`,
      );
    }

    await this.prisma.rolePermission.create({
      data: { roleId, permissionId },
    });
  }

  /**
   * Remove a permission from a role.
   * Throws NotFoundException if the mapping does not exist.
   */
  async removePermission(
    roleId: number,
    permissionId: number,
  ): Promise<void> {
    const existing = await this.prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId } },
    });

    if (!existing) {
      throw new NotFoundException(
        `Permission ${permissionId} is not assigned to role ${roleId}`,
      );
    }

    await this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  }

  /**
   * Get all permissions assigned to a role.
   */
  async getPermissions(roleId: number): Promise<Permission[]> {
    const mappings = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
      orderBy: { permission: { name: 'asc' } },
    });

    return mappings.map((rp) => rp.permission);
  }

  /**
   * Check whether a role has a specific permission.
   */
  async hasPermission(
    roleId: number,
    permissionId: number,
  ): Promise<boolean> {
    const mapping = await this.prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId } },
    });

    return mapping !== null;
  }
}
