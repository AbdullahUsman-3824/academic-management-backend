import { IsString, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  name!: string;   // free text — no pattern

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}