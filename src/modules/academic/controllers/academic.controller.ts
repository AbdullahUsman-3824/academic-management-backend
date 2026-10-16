import { Controller, Post, Get, Body } from '@nestjs/common';
import { AcademicService } from '../services/academic.service';
import { SemesterService } from '../services/semester.service';
import { AcademicSetupDto } from '../dto/academic-setup.dto';

@Controller('academics')
export class AcademicController {
  constructor(
    private readonly academicService: AcademicService,
    private readonly semesterService: SemesterService,
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
}
