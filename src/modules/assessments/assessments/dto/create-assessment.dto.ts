import { IsString, IsUUID, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssessmentDto {
  @IsUUID()
  courseAllocationId: string;

  @IsUUID()
  assessmentCategoryId: string;

  @IsString()
  title: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  totalMarks: number;

  @IsOptional()
  @IsDateString()
  assessmentDate?: string;
}

export class UpdateAssessmentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  totalMarks?: number;

  @IsOptional()
  @IsDateString()
  assessmentDate?: string;
}

export class SubmitAssessmentDto {
  @IsUUID()
  assessmentId: string;
}
