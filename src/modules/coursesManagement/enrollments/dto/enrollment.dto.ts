import { IsUUID, IsString, IsBoolean, IsOptional, IsIn } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  @IsOptional()
  studentAcademicRecordId?: string;

  @IsUUID()
  @IsOptional()
  studentId?: string; // Alternative to studentAcademicRecordId - backend will look up academic record

  @IsUUID()
  courseId!: string;

  @IsBoolean()
  @IsOptional()
  isExtra?: boolean;

  @IsUUID()
  @IsOptional()
  allocationId?: string; // Required when isExtra is true
}

export class UpdateEnrollmentStatusDto {
  @IsString()
  @IsIn(['enrolled', 'dropped', 'completed', 'failed', 'reappear'])
  status!: string;
}

export class BulkEnrollDto {
  @IsUUID()
  @IsOptional()
  studentAcademicRecordId?: string;

  @IsUUID()
  @IsOptional()
  studentId?: string; // Alternative to studentAcademicRecordId

  @IsUUID('4', { each: true })
  courseIds!: string[];

  @IsBoolean()
  @IsOptional()
  isExtra?: boolean;
}
