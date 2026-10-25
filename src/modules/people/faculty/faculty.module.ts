import { Module } from '@nestjs/common';
import { FacultyController } from './controllers/faculty.controller';
import { FacultyService } from './services/faculty.service';
import { DatabaseModule } from '../../../database/database.module';
import { UserModule } from '../../user/user.module';

@Module({
  imports: [DatabaseModule, UserModule],
  controllers: [FacultyController],
  providers: [FacultyService],
  exports: [FacultyService],
})
export class FacultyModule {}
