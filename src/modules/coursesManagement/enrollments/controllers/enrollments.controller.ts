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
  create(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    return this.enrollmentsService.create(createEnrollmentDto);
  }

  @Post('bulk')
  // @Permissions('enrollments:create')
  bulkEnroll(@Body() bulkEnrollDto: BulkEnrollDto) {
    return this.enrollmentsService.bulkEnroll(bulkEnrollDto);
  }

  @Get()
  // @Permissions('enrollments:read')
  findAll(
    @Query('studentId') studentId?: string,
    @Query('studentAcademicRecordId') studentAcademicRecordId?: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
  ) {
    return this.enrollmentsService.findAll({
      studentId,
      studentAcademicRecordId,
      courseId,
      status,
    });
  }

  @Get('student/:studentId')
  // @Permissions('enrollments:read')
  findByStudent(
    @Param('studentId') studentId: string,
    @Query('academicSessionId') academicSessionId?: string,
  ) {
    return this.enrollmentsService.findByStudent(studentId, academicSessionId);
  }

  @Get('stats/:studentAcademicRecordId')
  // @Permissions('enrollments:read')
  getStats(@Param('studentAcademicRecordId') studentAcademicRecordId: string) {
    return this.enrollmentsService.getEnrollmentStats(studentAcademicRecordId);
  }

  @Get(':id')
  // @Permissions('enrollments:read')
  findOne(@Param('id') id: string) {
    return this.enrollmentsService.findOne(id);
  }

  @Patch(':id/status')
  // @Permissions('enrollments:update')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateEnrollmentStatusDto,
  ) {
    return this.enrollmentsService.updateStatus(id, updateStatusDto);
  }

  @Patch(':id/drop')
  // @Permissions('enrollments:update')
  drop(@Param('id') id: string) {
    return this.enrollmentsService.drop(id);
  }

  @Delete(':id')
  // @Permissions('enrollments:delete')
  remove(@Param('id') id: string) {
    return this.enrollmentsService.remove(id);
  }
}
