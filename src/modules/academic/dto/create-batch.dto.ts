import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { BatchStatus } from '../../../generated/prisma/enums';

export class CreateBatchDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;
}
