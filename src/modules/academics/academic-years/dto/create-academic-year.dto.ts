import { IsString, IsDateString, IsIn, IsOptional } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  name: string; // e.g. "2026-27"

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'completed'])
  status?: string;
}