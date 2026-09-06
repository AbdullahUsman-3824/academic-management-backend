import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateAcademicYearDto } from '../../academics/academic-years/dto/update-academic-year.dto';
import { AcademicYear } from '../types/academic.types';

@Injectable()
export class AcademicYearsService {
  constructor(private prisma: PrismaService) {}

  async create(data: AcademicYear) {
    const existing = await this.prisma.academicYear.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException(
        `Academic Year "${data.name}" already exists`,
      );
    }

    return this.prisma.academicYear.create({
      data: {
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status ?? 'active',
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

  // TODO
  // findById()
  // findAll()
  // update()
  // validateDates()
  // activate()
  // complete()
}
