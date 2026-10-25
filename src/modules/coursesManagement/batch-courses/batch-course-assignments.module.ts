import { Module } from '@nestjs/common';
import { BatchCourseAssignmentsController } from './controller/batch-course-assignments.controller';
import { BatchCourseAssignmentsService } from './service/batch-course-assignments.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BatchCourseAssignmentsController],
  providers: [BatchCourseAssignmentsService],
  exports: [BatchCourseAssignmentsService],
})
export class BatchCourseAssignmentsModule {}
