import { IsString, IsDateString, IsUUID, IsIn, IsOptional } from 'class-validator';

export class CreateAcademicSessionDto {
  @IsUUID()
  academicYearId: string;

  @IsString()
  name: string; // e.g. "Fall 2026"

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsIn(['upcoming', 'active', 'completed', 'cancelled'])
  status?: string;
}