import { IsString, IsDateString, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { AcademicSessionStatus } from '../enums/academic-session-status.enum';

export class CreateAcademicSessionDto {
  @IsUUID()
  academicYearId!: string;

  @IsString()
  name!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsEnum(AcademicSessionStatus)
  status?: AcademicSessionStatus;
}