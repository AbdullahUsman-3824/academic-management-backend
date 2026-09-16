import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  creditHours?: number;
}