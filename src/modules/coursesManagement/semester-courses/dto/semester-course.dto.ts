import {
  IsInt,
  IsUUID,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSemesterCourseDto {
  // CHANGED: Use semesterId instead of semesterNumber
  @IsUUID()
  semesterId!: string; // CHANGED

  @IsUUID()
  courseId!: string;

  @IsOptional()
  @IsBoolean()
  isCompulsory?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

// NEW: For backward compatibility or convenience
export class CreateSemesterCourseByNumberDto {
  @IsInt()
  @Min(1)
  @Max(10)
  semesterNumber!: number;

  @IsUUID()
  courseId!: string;

  @IsOptional()
  @IsBoolean()
  isCompulsory?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class BulkSemesterCourseItemDto {
  @IsUUID()
  courseId!: string;

  @IsOptional()
  @IsBoolean()
  isCompulsory?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class BulkSemesterCourseDto {
  @IsUUID()
  semesterId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkSemesterCourseItemDto)
  courses!: BulkSemesterCourseItemDto[];
}