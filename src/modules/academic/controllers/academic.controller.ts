import { Controller, Post, Get, Body, Param, NotFoundException } from '@nestjs/common';
import { AcademicService } from '../services/academic.service';
import { SemesterService } from '../services/semester.service';
import { AcademicSetupDto } from '../dto/academic-setup.dto';
import { PrismaService } from '../../../database/prisma.service';

@Controller('academics')
export class AcademicController {
  constructor(
    private readonly academicService: AcademicService,
    private readonly semesterService: SemesterService,
    private readonly prisma: PrismaService,
  ) {}

  // POST /academics/setup
  @Post('setup')
  createSetup(@Body() dto: AcademicSetupDto) {
    return this.academicService.setup(dto);
  }

  // GET /academics/overview
  @Get('overview')
  getOverview() {
    return this.academicService.getOverview();
  }

  // GET /academics/semesters
  @Get('semesters')
  async getSemesters() {
    const semesters = await this.semesterService.findAll();
    return {
      success: true,
      data: semesters,
    };
  }

  // GET /academic/sections/:id/semester
  @Get('sections/:id/semester')
  async getSectionSemester(@Param('id') id: string) {
    const record = await this.prisma.studentAcademicRecord.findFirst({
      where: {
        sectionId: id,
        academicSession: {
          status: 'ACTIVE',
        },
      },
      select: {
        semesterNumber: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!record) {
      throw new NotFoundException(
        'No academic records found for this section',
      );
    }

    return {
      success: true,
      data: {
        semesterNumber: record.semesterNumber,
      },
    };
  }
}
