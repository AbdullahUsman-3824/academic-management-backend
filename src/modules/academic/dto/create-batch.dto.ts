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

  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;
}
