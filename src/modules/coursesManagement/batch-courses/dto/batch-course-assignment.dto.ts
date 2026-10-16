import {
  IsUUID,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBatchCourseAssignmentDto {
  @IsUUID()
  batchId: string;

  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsUUID()
  courseId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  semesterNumber: number;

  @IsBoolean()
  @IsOptional()
  isCompulsory?: boolean = true;

  @IsInt()
  @IsOptional()
  displayOrder?: number = 0;
}

export class BulkAssignCoursesDto {
  @IsUUID()
  batchId: string;

  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsInt()
  @Min(1)
  @Max(10)
  semesterNumber: number;

  @IsArray()
  @IsUUID('4', { each: true })
  courseIds: string[];

  @IsBoolean()
  @IsOptional()
  isCompulsory?: boolean = true;
}

export class UpdateBatchCourseAssignmentDto {
  @IsBoolean()
  @IsOptional()
  isCompulsory?: boolean;

  @IsInt()
  @IsOptional()
  displayOrder?: number;
}

export class GetBatchCoursesQueryDto {
  @IsUUID()
  batchId: string;

  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  semesterNumber?: number;
}

export class BatchCourseAssignmentResponseDto {
  id: string;
  batchId: string;
  sectionId: string | null;
  courseId: string;
  semesterNumber: number;
  isCompulsory: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date | null;

  // Relations
  batch?: {
    id: string;
    name: string;
  };
  section?: {
    id: string;
    name: string;
  } | null;
  course?: {
    id: string;
    code: string;
    name: string;
    creditHours: number;
  };
}
