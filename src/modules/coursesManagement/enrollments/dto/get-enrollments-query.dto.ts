import {
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetEnrollmentsQueryDto {
  @IsUUID('4')
  @IsOptional()
  studentId?: string;

  @IsUUID('4')
  @IsOptional()
  studentAcademicRecordId?: string;

  @IsUUID('4')
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  @IsIn(['enrolled', 'dropped', 'completed', 'failed', 'reappear'])
  status?: string;

  @IsString()
  @IsOptional()
  search?: string; // Search by student name, reg number, or CNIC

  @IsUUID('4')
  @IsOptional()
  batchId?: string;

  @IsUUID('4')
  @IsOptional()
  sectionId?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN'])
  studentStatus?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
