import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { SemesterCoursesService } from '../service/semester-courses.service';
import {
  CreateSemesterCourseDto,
  BulkSemesterCourseDto,
} from '../dto/semester-course.dto';

@Controller('semester-courses')
export class SemesterCoursesController {
  constructor(private readonly service: SemesterCoursesService) {}

  @Post()
  create(@Body() dto: CreateSemesterCourseDto) {
    return this.service.create(dto);
  }

  @Post('bulk')
  bulk(@Body() dto: BulkSemesterCourseDto) {
    return this.service.bulkCreate(dto);
  }

  @Get()
  findAll(@Query('semesterNumber') semesterNumber?: string) {
    if (semesterNumber) {
      return this.service.findBySemester(Number(semesterNumber));
    }
    return this.service.findAll();
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}