import {
  IsString,
  IsDateString,
  IsUUID,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { AcademicSessionStatus } from '../../../generated/prisma/client';
import { PartialType } from '@nestjs/mapped-types';

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

export class UpdateAcademicSessionDto extends PartialType(
  CreateAcademicSessionDto,
) {}
