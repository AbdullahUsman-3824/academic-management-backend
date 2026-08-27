import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Permission } from '../../../generated/prisma/client.js';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Permission[]> {
    return this.prisma.permission.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: number): Promise<Permission> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with id ${id} not found`);
    }

    return permission;
  }

  async findByName(name: string): Promise<Permission> {
    const permission = await this.prisma.permission.findUnique({
      where: { name },
    });

    if (!permission) {
      throw new NotFoundException(`Permission "${name}" not found`);
    }

    return permission;
  }
}
