import { Module } from '@nestjs/common';
import { SemesterCoursesController } from './controllers/semester-courses.controller';
import { SemesterCoursesService } from './service/semester-courses.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SemesterCoursesController],
  providers: [SemesterCoursesService],
  exports: [SemesterCoursesService],
})
export class SemesterCoursesModule {}
