import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service'; // ← adjust path if needed
import { CreateAcademicYearDto } from '../academic-years/dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from '../academic-years/dto/update-academic-year.dto';

@Injectable()
export class AcademicYearsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAcademicYearDto) {
    const existing = await this.prisma.academicYear.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Academic Year "${dto.name}" already exists`);
    }

    return this.prisma.academicYear.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: dto.status ?? 'active',
      },
    });
  }

  async findAll() {
    return this.prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        academicSessions: true,
      },
    });
  }

  async findOne(id: string) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
      include: {
        academicSessions: true,
      },
    });

    if (!year) {
      throw new NotFoundException(`Academic Year with id ${id} not found`);
    }

    return year;
  }

  async update(id: string, dto: UpdateAcademicYearDto) {
    await this.findOne(id);

    return this.prisma.academicYear.update({
      where: { id },
      data: {
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: dto.status,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.academicYear.delete({ where: { id } });
  }
}