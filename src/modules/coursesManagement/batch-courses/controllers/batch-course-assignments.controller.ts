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
import { BatchCourseAssignmentsService } from '../services/batch-course-assignments.service';
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
   * Query params: batchId, semesterNumber?
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
   * Query params: batchId, semesterNumber?
   */
  @Delete()
  async removeAll(
    @Query() query: GetBatchCoursesQueryDto,
  ): Promise<{ count: number }> {
    return this.service.removeAll(query);
  }
}
