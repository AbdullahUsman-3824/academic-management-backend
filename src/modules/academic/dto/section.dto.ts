import {
  IsUUID,
  IsString,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  MaxLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateSectionDto {
  @IsString()
  @IsOptional()
  @MaxLength(10)
  name?: string;
}

export class UpdateSectionDto extends PartialType(CreateSectionDto) {}

export class MoveStudentsSectionDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  studentIds!: string[];

  @IsOptional()
  @IsUUID()
  targetSectionId!: string | null;
}
