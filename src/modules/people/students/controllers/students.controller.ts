import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { StudentsService } from '../services/students.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { UpdateStudentStatusDto } from '../dto/update-student-status.dto';
import { QueryStudentsDto } from '../dto/query-students.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // ── 1. Enroll single student ──────────────────────────────────────────────

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

  // ── 2. List / search / filter ─────────────────────────────────────────────

  @Get()
  async findAll(@Query() query: QueryStudentsDto) {
    const result = await this.studentsService.findAll(query);
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  // ── 3. Get one student ────────────────────────────────────────────────────

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.studentsService.findOne(id);
    return {
      success: true,
      data,
    };
  }

  // ── 4. Update profile ─────────────────────────────────────────────────────

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

  // ── 5. Update status only ─────────────────────────────────────────────────

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

  // ── 6. Bulk enrollment ────────────────────────────────────────────────────

  @Post('bulk')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  async bulkCreate(
    @UploadedFile()
    file: {
      buffer: Buffer;
      size: number;
      mimetype: string;
      originalname: string;
    },
    @Query('dryRun') dryRun?: string,
  ) {
    const result = await this.studentsService.bulkCreate(
      file,
      dryRun === 'true',
    );

    return {
      success: true,
      message: 'Bulk enrollment completed',
      data: result,
    };
  }

  // ── 7. Download template ──────────────────────────────────────────────────

  @Get('bulk/template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.studentsService.getBulkTemplate();

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="student_bulk_enrollment_template.xlsx"',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
