import { Module } from '@nestjs/common';
import { CoursesController } from './controllers/courses.controller';
import { CoursesService } from './services/courses.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
