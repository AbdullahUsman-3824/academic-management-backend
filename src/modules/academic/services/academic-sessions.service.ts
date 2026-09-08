import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateAcademicSessionDto } from '../dto/update-academic-session.dto';
import { AcademicSession } from '../types/academic.types';
import { CreateAcademicSessionDto } from '../dto/create-academic-session.dto';
@Injectable()
export class AcademicSessionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAcademicSessionDto) {
  const year = await this.prisma.academicYear.findUnique({
    where: { id: dto.academicYearId },
  });

  if (!year) {
    throw new NotFoundException(`Academic Year with id ${dto.academicYearId} not found`);
  }

  return this.prisma.academicSession.create({
    data: {
      academicYearId: dto.academicYearId,
      name: dto.name,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      status: dto.status ?? 'upcoming',
    },
    include: {
      academicYear: true,
    },
  });
}

  async findAll() {
  return this.prisma.academicSession.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      academicYear: true,
    },
  });
}

  // async findByYear(academicYearId: string) {
  //   return this.prisma.academicSession.findMany({
  //     where: { academicYearId },
  //     orderBy: { startDate: 'asc' },
  //     include: {
  //       academicYear: true,
  //     },
  //   });
  // }


  async findOne(id: string) {
  const session = await this.prisma.academicSession.findUnique({
    where: { id },
    include: {
      academicYear: true,
    },
  });

  if (!session) {
    throw new NotFoundException(`Academic Session with id ${id} not found`);
  }

  return session;
}

async update(id: string, dto: UpdateAcademicSessionDto) {
  await this.findOne(id);

  return this.prisma.academicSession.update({
    where: { id },
    data: {
      academicYearId: dto.academicYearId,
      name: dto.name,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      status: dto.status,
    },
    include: {
      academicYear: true,
    },
  });
}

  async remove(id: string) {
  await this.findOne(id);

  return this.prisma.academicSession.delete({
    where: { id },
  });
}

  // TODO
  // findById()
  // update()
  // activate()
  // complete()
  // cancel()
  // validateDates()
}
