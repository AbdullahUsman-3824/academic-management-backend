import { Controller, Post, Get, Body } from '@nestjs/common';
import { AcademicService } from '../services/academic.service';
import { AcademicSetupDto } from '../dto/academic-setup.dto';

@Controller('academics')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

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
}
