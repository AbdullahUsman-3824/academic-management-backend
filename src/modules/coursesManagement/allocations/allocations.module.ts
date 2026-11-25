import { DatabaseModule } from '../../../database/database.module';
import { Module } from '@nestjs/common';
import { AllocationsController } from './controllers/allocations.controller';
import { AllocationsService } from './services/allocations.service';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  imports: [DatabaseModule, EnrollmentsModule],
  controllers: [AllocationsController],
  providers: [AllocationsService],
  exports: [AllocationsService],
})
export class AllocationsModule {}
