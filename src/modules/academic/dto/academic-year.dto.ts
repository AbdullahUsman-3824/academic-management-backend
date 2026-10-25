import { IsString, IsDateString, IsNotEmpty, Matches } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}$/, {
    message: 'Academic year must be a 4-digit year, e.g. 2025',
  })
  name!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class UpdateAcademicYearDto extends PartialType(CreateAcademicYearDto) {}
