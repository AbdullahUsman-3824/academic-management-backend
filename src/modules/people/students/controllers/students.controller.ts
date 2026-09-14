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
} from '@nestjs/common';
import { StudentsService } from '../services/students.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { UpdateStudentStatusDto } from '../dto/update-student-status.dto';
import { QueryStudentsDto } from '../dto/query-students.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateStudentDto) {
    const data = await this.studentsService.create(dto);
    return {
      success: true,
      message: 'Student enrolled successfully',
      data,
    };
  }

  @Get()
  async findAll(@Query() query: QueryStudentsDto) {
    const result = await this.studentsService.findAll(query);
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.studentsService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    const data = await this.studentsService.update(id, dto);
    return {
      success: true,
      message: 'Student updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentStatusDto,
  ) {
    const data = await this.studentsService.updateStatus(id, dto);
    return {
      success: true,
      message: 'Student status updated successfully',
      data,
    };
  }
}