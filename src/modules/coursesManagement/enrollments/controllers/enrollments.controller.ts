import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EnrollmentsService } from '../service/enrollments.service';
import {
  CreateEnrollmentDto,
  UpdateEnrollmentStatusDto,
  BulkEnrollDto,
} from '../dto/enrollment.dto';
import { GetEnrollmentsQueryDto } from '../dto/get-enrollments-query.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
// TODO: Implement PermissionsGuard and Permissions decorator
// import { PermissionsGuard } from '../../../../common/guards/permissions.guard';
// import { Permissions } from '../../../../common/decorators/permissions.decorator';

@Controller('enrollments')
@UseGuards(JwtAuthGuard) // TODO: Add PermissionsGuard when implemented
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  // @Permissions('enrollments:create')
  async create(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    const data = await this.enrollmentsService.create(createEnrollmentDto);
    return { success: true, data };
  }

  @Post('bulk')
  // @Permissions('enrollments:create')
  async bulkEnroll(@Body() bulkEnrollDto: BulkEnrollDto) {
    const data = await this.enrollmentsService.bulkEnroll(bulkEnrollDto);
    return { success: true, data };
  }

  @Post('bulk-re-enroll')
  // @Permissions('enrollments:create')
  async bulkReEnroll(
    @Body()
    body: {
      batchId?: string;
      academicSessionId?: string;
      dryRun?: boolean;
    },
  ) {
    const data = await this.enrollmentsService.bulkReEnrollStudents(body);
    return {
      success: true,
      message: body.dryRun
        ? 'Bulk re-enrollment preview completed'
        : 'Bulk re-enrollment completed',
      data,
    };
  }

  @Get()
  // @Permissions('enrollments:read')
  async findAll(@Query() query: GetEnrollmentsQueryDto) {
    const result = await this.enrollmentsService.findAll(query);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get('available-allocations/:courseId')
  // @Permissions('enrollments:read')
  async getAvailableAllocations(@Param('courseId') courseId: string) {
    const data = await this.enrollmentsService.getAvailableAllocations(courseId);
    return { success: true, data };
  }

  @Get('student/:studentId')
  // @Permissions('enrollments:read')
  async findByStudent(
    @Param('studentId') studentId: string,
    @Query('academicSessionId') academicSessionId?: string,
  ) {
    const data = await this.enrollmentsService.findByStudent(studentId, academicSessionId);
    return { success: true, data };
  }

  @Get('stats/:studentAcademicRecordId')
  // @Permissions('enrollments:read')
  async getStats(@Param('studentAcademicRecordId') studentAcademicRecordId: string) {
    const data = await this.enrollmentsService.getEnrollmentStats(studentAcademicRecordId);
    return { success: true, data };
  }

  @Get(':id')
  // @Permissions('enrollments:read')
  async findOne(@Param('id') id: string) {
    const data = await this.enrollmentsService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id/status')
  // @Permissions('enrollments:update')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateEnrollmentStatusDto,
  ) {
    const data = await this.enrollmentsService.updateStatus(id, updateStatusDto);
    return { success: true, data };
  }

  @Patch(':id/drop')
  // @Permissions('enrollments:update')
  async drop(@Param('id') id: string) {
    const data = await this.enrollmentsService.drop(id);
    return { success: true, data };
  }

  @Delete(':id')
  // @Permissions('enrollments:delete')
  async remove(@Param('id') id: string) {
    const data = await this.enrollmentsService.remove(id);
    return { success: true, data };
  }
}
