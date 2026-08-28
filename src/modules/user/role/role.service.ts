import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Role } from '../../../generated/prisma/client.js';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Role[]> {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string): Promise<Role> {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    return role;
  }

  async findByName(name: string): Promise<Role> {
    const role = await this.prisma.role.findUnique({ where: { name } });

    if (!role) {
      throw new NotFoundException(`Role "${name}" not found`);
    }

    return role;
  }
}
