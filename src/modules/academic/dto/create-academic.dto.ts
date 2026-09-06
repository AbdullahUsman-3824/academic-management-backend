import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAcademicSessionDto } from './create-academic-session.dto';

export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsDateString()
  @IsNotEmpty()
  startDate!: Date;

  @IsDateString()
  @IsNotEmpty()
  endDate!: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAcademicSessionDto)
  sessions!: CreateAcademicSessionDto[];
}
