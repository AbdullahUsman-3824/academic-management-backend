import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OmitType } from '@nestjs/mapped-types';
import { CreateAcademicYearDto } from './academic-year.dto';
import { CreateAcademicSessionDto } from './academic-session.dto';

export class SessionInSetupDto extends OmitType(CreateAcademicSessionDto, [
  'academicYearId',
] as const) {}

export class AcademicSetupDto {
  @ValidateNested()
  @Type(() => CreateAcademicYearDto)
  year!: CreateAcademicYearDto;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => SessionInSetupDto)
  sessions!: SessionInSetupDto[];
}
