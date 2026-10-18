import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import type { SafeUser } from '../../../../common/types/user';
import { AssessmentService } from '../services/assessment.service';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
} from '../dto/create-assessment.dto';
import {
  BulkMarkEntryDto,
  UpdateStudentMarkDto,
} from '../dto/student-marks.dto';

@Controller('faculty/assessments')
@UseGuards(JwtAuthGuard)
export class AssessmentController {
  constructor(private assessmentService: AssessmentService) {}

  // Get all assessment categories
  @Get('categories')
  async getCategories() {
    const data = await this.assessmentService.getAssessmentCategories();
    return { success: true, data };
  }

  // Get assessments for a specific allocation
  @Get('allocation/:allocationId')
  async getAssessmentsByAllocation(
    @Param('allocationId') allocationId: string,
    @CurrentUser() user: SafeUser
  ) {
    const data = await this.assessmentService.getAssessmentsByAllocation(allocationId, user.id);
    return { success: true, data };
  }

  // Create new assessment
  @Post()
  async createAssessment(
    @Body() dto: CreateAssessmentDto,
    @CurrentUser() user: SafeUser
  ) {
    const data = await this.assessmentService.createAssessment(dto, user.id);
    return { success: true, data };
  }

  // Update assessment
  @Put(':id')
  async updateAssessment(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
    @CurrentUser() user: SafeUser
  ) {
    const data = await this.assessmentService.updateAssessment(id, dto, user.id);
    return { success: true, data };
  }

  // Delete assessment
  @Delete(':id')
  async deleteAssessment(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    await this.assessmentService.deleteAssessment(id, user.id);
    return { success: true, message: 'Assessment deleted successfully' };
  }

  // Get assessment details with student marks
  @Get(':id/details')
  async getAssessmentDetails(
    @Param('id') id: string,
    @CurrentUser() user: SafeUser
  ) {
    const data = await this.assessmentService.getAssessmentDetails(id, user.id);
    return { success: true, data };
  }

  // Bulk mark entry
  @Post('marks/bulk')
  async bulkMarkEntry(@Body() dto: BulkMarkEntryDto, @CurrentUser() user: SafeUser) {
    const data = await this.assessmentService.bulkMarkEntry(dto, user.id);
    return { success: true, data };
  }

  // Update single student mark
  @Put(':assessmentId/marks/:studentId')
  async updateStudentMark(
    @Param('assessmentId') assessmentId: string,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateStudentMarkDto,
    @CurrentUser() user: SafeUser
  ) {
    const data = await this.assessmentService.updateStudentMark(
      assessmentId,
      studentId,
      dto,
      user.id
    );
    return { success: true, data };
  }

  // Submit assessment (lock it)
  @Post(':id/submit')
  async submitAssessment(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    const data = await this.assessmentService.submitAssessment(id, user.id);
    return { success: true, data };
  }
}
