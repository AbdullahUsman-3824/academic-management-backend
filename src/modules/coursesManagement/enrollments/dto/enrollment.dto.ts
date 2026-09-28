import { IsUUID, IsString, IsBoolean, IsOptional, IsIn } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  studentAcademicRecordId: string;

  @IsUUID()
  courseId: string;

  @IsBoolean()
  @IsOptional()
  isExtra?: boolean;
}

export class UpdateEnrollmentStatusDto {
  @IsString()
  @IsIn(['enrolled', 'dropped', 'completed', 'failed', 'reappear'])
  status: string;
}

export class BulkEnrollDto {
  @IsUUID()
  studentAcademicRecordId: string;

  @IsUUID('4', { each: true })
  courseIds: string[];

  @IsBoolean()
  @IsOptional()
  isExtra?: boolean;
}
