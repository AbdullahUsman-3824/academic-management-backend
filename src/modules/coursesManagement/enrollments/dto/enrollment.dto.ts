import {
  IsUUID,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { CourseEnrollmentStatus } from '../../../../generated/prisma/enums';

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
  @IsEnum(CourseEnrollmentStatus)
  status!: CourseEnrollmentStatus;
}

export class BulkEnrollDto {
  @IsUUID()
  @IsOptional()
  studentAcademicRecordId?: string;

  @IsUUID()
  @IsOptional()
  studentId?: string; // Alternative to studentAcademicRecordId

  @IsArray()
  @IsUUID('4', { each: true })
  courseIds!: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  allocationIds?: string[];

  @IsBoolean()
  @IsOptional()
  isExtra?: boolean;
}
