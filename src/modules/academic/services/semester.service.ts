import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Semester } from '../../../generated/prisma/client';

@Injectable()
export class SemesterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all semesters ordered by number
   */
  async findAll(): Promise<Semester[]> {
    return this.prisma.semester.findMany({
      where: { isActive: true },
      orderBy: { number: 'asc' },
    });
  }

  /**
   * Find a semester by ID
   */
  async findOne(id: string): Promise<Semester> {
    const semester = await this.prisma.semester.findUnique({
      where: { id },
    });

    if (!semester) {
      throw new NotFoundException(`Semester with ID "${id}" not found`);
    }

    return semester;
  }

  /**
   * Find a semester by number
   */
  async findByNumber(number: number): Promise<Semester> {
    const semester = await this.prisma.semester.findUnique({
      where: { number },
    });

    if (!semester) {
      throw new NotFoundException(`Semester number ${number} not found`);
    }

    return semester;
  }
}
