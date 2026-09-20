import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMinSize,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AutoCreateSectionsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class MoveStudentsDto {
  @IsUUID('4')
  targetSectionId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  studentIds!: string[];
}

export class ManualAssignDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ManualSectionDto)
  sections!: ManualSectionDto[];
}

export class ManualSectionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  studentIds!: string[];
}