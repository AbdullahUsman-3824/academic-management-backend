import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AcademicYearsService } from '../services/academic-years.service';
import { UpdateAcademicYearDto } from '../dto/update-academic-year.dto';
import { AcademicYearStatus } from '../../../generated/prisma/enums';

@Controller('academics/years')
export class AcademicYearController {
  constructor(private readonly yearService: AcademicYearsService) {}

  // GET /academics/years?status=active|inactive|completed
  @Get()
  findAllYears(@Query('status') status?: AcademicYearStatus) {
    return this.yearService.findAll(status);
  }

  // GET /academics/years/:id
  @Get(':id')
  findOneYear(@Param('id', ParseUUIDPipe) id: string) {
    return this.yearService.findOne(id);
  }

  // PATCH /academics/years/:id
  @Patch(':id')
  updateYear(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return this.yearService.update(id, dto);
  }
}
