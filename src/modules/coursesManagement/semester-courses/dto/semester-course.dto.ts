import {
  IsInt,
  IsUUID,
  IsBoolean,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

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
  @Max(8)
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

export class BulkSemesterCourseDto {
  @IsUUID()
  semesterId!: string; // CHANGED

  @IsUUID('4', { each: true })
  courseIds!: string[];
}