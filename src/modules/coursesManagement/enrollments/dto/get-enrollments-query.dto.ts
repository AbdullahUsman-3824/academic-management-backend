import {
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  Min,
  Max,
  IsEnum,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CourseEnrollmentStatus } from '../../../../generated/prisma/enums';

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

  @IsEnum(CourseEnrollmentStatus)
  @IsOptional()
  status?: CourseEnrollmentStatus;

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

  @IsUUID('4')
  @IsOptional()
  academicSessionId?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  allSessions?: boolean;
}
