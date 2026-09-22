import { Module } from '@nestjs/common';

import { StudentsController } from './controllers/students.controller';
import { StudentsService } from './services/students.service';

import { DatabaseModule } from '../../../database/database.module';
import { UserModule } from '../../user/user.module';

@Module({
  imports: [DatabaseModule, UserModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
