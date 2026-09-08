import { IsString, IsDateString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { AcademicYearStatus } from '../enums/academic-year-status.enum';

export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsNotEmpty()
  @IsEnum(AcademicYearStatus)
  status?: AcademicYearStatus;
}