import { Module } from '@nestjs/common';
import { BatchCourseAssignmentsController } from './controllers/batch-course-assignments.controller';
import { BatchCourseAssignmentsService } from './services/batch-course-assignments.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BatchCourseAssignmentsController],
  providers: [BatchCourseAssignmentsService],
  exports: [BatchCourseAssignmentsService],
})
export class BatchCourseAssignmentsModule {}
