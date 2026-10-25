import { DatabaseModule } from '@/database/database.module';
import { Module } from '@nestjs/common';
import { AllocationsController } from './controller/allocations.controller';
import { AllocationsService } from './service/allocations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AllocationsController],
  providers: [AllocationsService],
  exports: [AllocationsService],
})
export class AllocationsModule {}
