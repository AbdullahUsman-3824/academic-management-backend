import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { BatchCourseAssignmentsService } from '../service/batch-course-assignments.service';
import {
  CreateBatchCourseAssignmentDto,
  BulkAssignCoursesDto,
  UpdateBatchCourseAssignmentDto,
  GetBatchCoursesQueryDto,
  BatchCourseAssignmentResponseDto,
} from '../dto/batch-course-assignment.dto';

@Controller('batch-course-assignments')
export class BatchCourseAssignmentsController {
  constructor(private readonly service: BatchCourseAssignmentsService) {}

  /**
   * POST /batch-course-assignments
   * Assign a single course to a batch/semester
   */
  @Post()
  async create(
    @Body() dto: CreateBatchCourseAssignmentDto,
  ): Promise<BatchCourseAssignmentResponseDto> {
    return this.service.create(dto);
  }

  /**
   * POST /batch-course-assignments/bulk
   * Bulk assign courses to a batch/semester
   */
  @Post('bulk')
  async bulkAssign(
    @Body() dto: BulkAssignCoursesDto,
  ): Promise<{ count: number }> {
    return this.service.bulkAssign(dto);
  }

  /**
   * GET /batch-course-assignments
   * Get courses assigned to a batch/semester
   * Query params: batchId, semesterNumber?, sectionId?
   */
  @Get()
  async findAll(
    @Query() query: GetBatchCoursesQueryDto,
  ): Promise<BatchCourseAssignmentResponseDto[]> {
    return this.service.findAll(query);
  }

  /**
   * GET /batch-course-assignments/:id
   * Get a single assignment
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<BatchCourseAssignmentResponseDto> {
    return this.service.findOne(id);
  }

  /**
   * PATCH /batch-course-assignments/:id
   * Update an assignment
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBatchCourseAssignmentDto,
  ): Promise<BatchCourseAssignmentResponseDto> {
    return this.service.update(id, dto);
  }

  /**
   * DELETE /batch-course-assignments/:id
   * Remove a single assignment
   */
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.service.remove(id);
    return { message: 'Assignment removed successfully' };
  }

  /**
   * DELETE /batch-course-assignments
   * Remove all courses from a batch/semester
   * Query params: batchId, semesterNumber?, sectionId?
   */
  @Delete()
  async removeAll(
    @Query() query: GetBatchCoursesQueryDto,
  ): Promise<{ count: number }> {
    return this.service.removeAll(query);
  }

  /**
   * GET /batch-course-assignments/preview-template/:batchId
   * Preview what courses will be copied from semester_courses template
   * Query params: semesterNumber, sectionId?
   */
  @Get('preview-template/:batchId')
  async previewTemplateCopy(
    @Param('batchId') batchId: string,
    @Query('semesterNumber') semesterNumber: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.service.previewTemplateCopy(
      batchId,
      parseInt(semesterNumber, 10),
      sectionId,
    );
  }

  /**
   * POST /batch-course-assignments/copy-from-template
   * Copy courses from semester_courses template to a batch for a specific semester
   */
  @Post('copy-from-template')
  async copyFromTemplate(
    @Body() dto: { batchId: string; semesterNumber: number; sectionId?: string },
  ): Promise<{ count: number; message: string }> {
    const result = await this.service.copyFromTemplate(
      dto.batchId,
      dto.semesterNumber,
      dto.sectionId,
    );
    return {
      ...result,
      message: `Successfully copied ${result.count} courses from template for Semester ${dto.semesterNumber}`,
    };
  }
}
