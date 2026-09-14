import { IsEnum } from 'class-validator';
import { StudentStatus } from '../enums/student-status.enum';

export class UpdateStudentStatusDto {
  @IsEnum(StudentStatus)
  status!: StudentStatus;
}