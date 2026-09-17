import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { CoursesService } from '../services/courses.service';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { UpdateCourseStatusDto } from '../dto/update-course-status.dto';
import { QueryCoursesDto } from '../dto/query-courses.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCourseDto) {
    const data = await this.coursesService.create(dto);
    return {
      success: true,
      message: 'Course created successfully',
      data,
    };
  }

  @Get()
  async findAll(@Query() query: QueryCoursesDto) {
    const result = await this.coursesService.findAll(query);
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.coursesService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    const data = await this.coursesService.update(id, dto);
    return {
      success: true,
      message: 'Course updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseStatusDto,
  ) {
    const data = await this.coursesService.updateStatus(id, dto);
    return {
      success: true,
      message: 'Course status updated successfully',
      data,
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.coursesService.remove(id);
    return {
      success: true,
      message: 'Course deleted successfully',
    };
  }
}
