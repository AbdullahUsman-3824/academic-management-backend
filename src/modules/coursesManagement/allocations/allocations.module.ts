import { DatabaseModule } from '../../../database/database.module';
import { Module } from '@nestjs/common';
import { AllocationsController } from './controllers/allocations.controller';
import { AllocationsService } from './services/allocations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AllocationsController],
  providers: [AllocationsService],
  exports: [AllocationsService],
})
export class AllocationsModule {}
