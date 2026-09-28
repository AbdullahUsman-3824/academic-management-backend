import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { CreateAllocationDto } from '../dto/create-allocation.dto';

@Injectable()
export class AllocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAllocationDto) {
    // validate all foreign keys
    const [course, faculty, session, section] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: dto.courseId } }),
      this.prisma.faculty.findUnique({ where: { id: dto.facultyId } }),
      this.prisma.academicSession.findUnique({
        where: { id: dto.academicSessionId },
      }),
      this.prisma.section.findUnique({ where: { id: dto.sectionId } }),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!faculty) throw new NotFoundException('Faculty not found');
    if (!session) throw new NotFoundException('Academic session not found');
    if (!section) throw new NotFoundException('Section not found');

    try {
      return await this.prisma.courseAllocation.create({
        data: {
          courseId: dto.courseId,
          facultyId: dto.facultyId,
          academicSessionId: dto.academicSessionId,
          sectionId: dto.sectionId,
          status: 'active',
        },
        include: {
          course: true,
          faculty: true,
          section: true,
          academicSession: true,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'This allocation already exists (same course + faculty + session + section)',
        );
      }
      throw e;
    }
  }

  async findAll(params?: {
    academicSessionId?: string;
    sectionId?: string;
    facultyId?: string;
  }) {
    return this.prisma.courseAllocation.findMany({
      where: {
        ...(params?.academicSessionId && {
          academicSessionId: params.academicSessionId,
        }),
        ...(params?.sectionId && { sectionId: params.sectionId }),
        ...(params?.facultyId && { facultyId: params.facultyId }),
        status: 'active',
      },
      include: {
        course: true,
        faculty: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
        section: true,
        academicSession: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string) {
    await this.prisma.courseAllocation.update({
      where: { id },
      data: { status: 'inactive' },
    });
    return { id };
  }
}