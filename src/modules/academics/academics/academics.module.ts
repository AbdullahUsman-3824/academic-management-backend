import { Module } from '@nestjs/common';
import { AcademicYearsController } from '../academic-years/academic-years.controller';
import { AcademicYearsService } from '../academic-years/academic-years.service';
import { AcademicSessionsController } from '../academic-sessions/academic-sessions.controller';
import { AcademicSessionsService } from '../academic-sessions/academic-sessions.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AcademicYearsController, AcademicSessionsController],
  providers: [AcademicYearsService, AcademicSessionsService],
  exports: [AcademicYearsService, AcademicSessionsService],
})
export class AcademicsModule {}