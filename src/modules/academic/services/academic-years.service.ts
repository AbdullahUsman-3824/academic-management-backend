
import { PrismaService } from '../../../database/prisma.service';
import { ConflictException } from "@nestjs/common/exceptions/conflict.exception";
import { create } from "domain";
import { CreateAcademicYearDto } from "../dto/create-academic-year.dto";
import { Injectable ,  NotFoundException} from "@nestjs/common";
import { UpdateAcademicYearDto } from '../dto/update-academic-year.dto';


@Injectable()
export class AcademicYearsService {
  constructor(private prisma: PrismaService) {}

async create(data: CreateAcademicYearDto) {
  const existing = await this.prisma.academicYear.findUnique({
    where: { name: data.name },
  });

  if (existing) {
    throw new ConflictException(`Academic Year "${data.name}" already exists`);
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
    orderBy: {
      startDate: 'desc',
    },
    include: {
      academicSessions: true,
    },
  });
}


async update(id: string, dto: UpdateAcademicYearDto) {
  // First check if the year exists
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


async remove(id: string) {
  await this.findOne(id); // This will throw error if not found

  return this.prisma.academicYear.delete({
    where: { id },
  });
}

  // TODO
  // findById()
  // findAll()
  // update()
  // validateDates()
  // activate()
  // complete()
}


