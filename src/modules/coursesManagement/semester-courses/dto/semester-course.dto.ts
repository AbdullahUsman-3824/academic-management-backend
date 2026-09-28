import { IsInt, IsUUID, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CreateSemesterCourseDto {
  @IsInt()
  @Min(1)
  @Max(16)
  semesterNumber!: number;

  @IsUUID()
  courseId!: string;

  @IsOptional()
  @IsBoolean()
  isCompulsory?: boolean;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class BulkSemesterCourseDto {
  @IsInt()
  @Min(1)
  @Max(16)
  semesterNumber!: number;

  @IsUUID('4', { each: true })
  courseIds!: string[];
}