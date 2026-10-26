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
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { StudentsService } from '../services/students.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { UpdateStudentStatusDto } from '../dto/update-student-status.dto';
import { QueryStudentsDto } from '../dto/query-students.dto';
import { QueryStudentMarksDto } from '../dto/query-student-marks.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import type { SafeUser } from '../../../../common/types/user';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';

@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  ADMIN / STAFF ROUTES
  // ═══════════════════════════════════════════════════════════════════════════

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
    const result = await this.studentsService.list(query);
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  // ── 3. Bulk enrollment ────────────────────────────────────────────────────
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

  // ── 4. Download bulk template ─────────────────────────────────────────────
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

  // ═══════════════════════════════════════════════════════════════════════════
  //  STUDENT SELF-SERVICE ROUTES  (students/me/*)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 5. Basic info  ─────────────────────────────────────────────────────────
  @Get('me')
  async getMe(@CurrentUser() user: SafeUser) {
    const data = await this.studentsService.getMe(user.id);
    return { success: true, data };
  }

  // ── 6. Dashboard  ──────────────────────────────────────────────────────────
  @Get('me/dashboard')
  async getMyDashboard(@CurrentUser() user: SafeUser) {
    const data = await this.studentsService.getMyDashboard(user.id);
    return { success: true, data };
  }

  // ── 6.5. Courses List ─────────────────────────────────────────────────────
  @Get('me/course-options')
  async getMyCoursesOptions(@CurrentUser() user: SafeUser) {
    const data = await this.studentsService.getMyCourseOptions(user.id);
    return { success: true, data };
  }

  // ── 7. Marks (all courses + filters) ──────────────────────────────────────
  @Get('me/marks')
  async getMyMarks(
    @CurrentUser() user: SafeUser,
    @Query() query: QueryStudentMarksDto,
  ) {
    const data = await this.studentsService.getMyMarks(user.id, query);
    return { success: true, data };
  }

  // ── 8. Results / Transcript ───────────────────────────────────────────────
  @Get('me/results')
  async getMyResults(@CurrentUser() user: SafeUser) {
    // const data = await this.studentsService.getMyResults(user.id);
    // return { success: true, data };
  }

  // ── 9. Fees ───────────────────────────────────────────────────────────────
  @Get('me/fees')
  async getMyFees(@CurrentUser() user: SafeUser) {
    // const data = await this.studentsService.getMyFees(user.id);
    // return { success: true, data };
  }

  // ── 10. Detailed Profile ──────────────────────────────────────────────────
  @Get('me/profile')
  async getMyProfile(@CurrentUser() user: SafeUser) {
    const data = await this.studentsService.getMyProfile(user.id);
    return { success: true, data };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PARAMETRIC ROUTES (must come after static routes)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 11. Get one student ───────────────────────────────────────────────────
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.studentsService.findOne(id);
    return {
      success: true,
      data,
    };
  }

  // ── 12. Update profile ────────────────────────────────────────────────────
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

  // ── 13. Update status only ────────────────────────────────────────────────
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
