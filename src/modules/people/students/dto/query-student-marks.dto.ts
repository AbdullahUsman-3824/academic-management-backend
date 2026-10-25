import { IsOptional, IsUUID, IsString } from 'class-validator';

export class QueryStudentMarksDto {
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsString()
  category?: string; // e.g., 'Midterm Exam', 'Quiz', etc.
}
