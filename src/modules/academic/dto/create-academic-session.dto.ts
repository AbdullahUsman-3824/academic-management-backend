import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateAcademicSessionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsDateString()
  @IsNotEmpty()
  startDate!: Date;

  @IsDateString()
  @IsNotEmpty()
  endDate!: Date;
}
