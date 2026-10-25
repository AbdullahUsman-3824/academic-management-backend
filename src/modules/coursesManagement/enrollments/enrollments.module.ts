import { Module } from '@nestjs/common';
import { EnrollmentsController } from './controllers/enrollments.controller';
import { EnrollmentsService } from './service/enrollments.service';
import { DatabaseModule } from '../../../database/database.module';
import { BatchCourseAssignmentsModule } from '../batch-courses/batch-course-assignments.module';

@Module({
  imports: [DatabaseModule, BatchCourseAssignmentsModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
