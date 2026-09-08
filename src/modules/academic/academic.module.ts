import { Module } from '@nestjs/common';
import { AcademicController } from './controllers/academic.controller';
import { AcademicService } from './services/academic.service';
import { AcademicYearsService } from './services/academic-years.service';
import { AcademicSessionsService } from './services/academic-sessions.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AcademicController],
  providers: [
    AcademicService,
    AcademicYearsService,
    AcademicSessionsService,
  ],
  exports: [AcademicService, AcademicYearsService, AcademicSessionsService],
})
export class AcademicModule {}