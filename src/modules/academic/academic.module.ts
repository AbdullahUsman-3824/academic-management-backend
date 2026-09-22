import { Module } from '@nestjs/common';
import { AcademicController } from './controllers/academic.controller';
import { AcademicYearController } from './controllers/academic-years.controller';
import { AcademicSessionController } from './controllers/academic-sessions.controller';
import { AcademicBatchController } from './controllers/academic-batches.controller';
import { AcademicProgressionController } from './controllers/academic-progression.controller';
import { AcademicService } from './services/academic.service';
import { AcademicYearsService } from './services/academic-years.service';
import { AcademicSessionsService } from './services/academic-sessions.service';
import { BatchService } from './services/batch.service';
import { AcademicProgressionService } from './services/academic-progression.service';
import { SectionService } from './services/section.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AcademicController,
    AcademicYearController,
    AcademicSessionController,
    AcademicBatchController,
    AcademicProgressionController,
  ],
  providers: [
    AcademicService,
    AcademicYearsService,
    AcademicSessionsService,
    BatchService,
    AcademicProgressionService,
    SectionService,
  ],
  exports: [
    AcademicService,
    AcademicYearsService,
    AcademicSessionsService,
    BatchService,
    AcademicProgressionService,
  ],
})
export class AcademicModule {}
