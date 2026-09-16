import { Module } from '@nestjs/common';
import { StudentsController } from './controllers/students.controller';
import { StudentsService } from './services/students.service';
import { UserService } from '../../user/user.service';
import { RoleService } from '../../user/role/role.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [StudentsController],
  providers: [StudentsService, UserService, RoleService],
  exports: [StudentsService],
})
export class StudentsModule {}
