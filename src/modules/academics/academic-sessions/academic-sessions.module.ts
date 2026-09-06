import { Module } from '@nestjs/common';
import { AcademicSessionsService } from '../../academic/services/academic-sessions.service';
import { AcademicSessionsController } from './academic-sessions.controller';

@Module({
  controllers: [AcademicSessionsController],
  providers: [AcademicSessionsService],
})
export class AcademicSessionsModule {}
