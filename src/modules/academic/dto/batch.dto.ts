import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsUUID,
  Min,
} from 'class-validator';
import { BatchStatus } from '../../../generated/prisma/enums';
import { PartialType } from '@nestjs/mapped-types';

export class CreateBatchDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUUID()
  @IsNotEmpty()
  entryYearId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  programDuration?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sectionCapacity?: number;
}

export class UpdateBatchDto extends PartialType(CreateBatchDto) {
  @IsString()
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;
}
