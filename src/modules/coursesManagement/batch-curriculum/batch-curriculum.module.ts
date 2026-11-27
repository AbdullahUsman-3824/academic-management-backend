import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { BatchCurriculumController } from './batch-curriculum.controller';
import { BatchCurriculumService } from './batch-curriculum.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BatchCurriculumController],
  providers: [BatchCurriculumService],
  exports: [BatchCurriculumService],
})
export class BatchCurriculumModule {}
