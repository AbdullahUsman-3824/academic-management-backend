import { Module } from '@nestjs/common';
import { AcademicYearsService } from '../../academic/services/academic-years.service';
import { AcademicYearsController } from './academic-years.controller';

@Module({
  controllers: [AcademicYearsController],
  providers: [AcademicYearsService],
})
export class AcademicYearsModule {}
