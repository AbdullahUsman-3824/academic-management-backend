import { PartialType } from '@nestjs/mapped-types';
import { CreateBatchDto } from './create-batch.dto';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { BatchStatus } from '../../../generated/prisma/enums';

export class UpdateBatchDto extends PartialType(CreateBatchDto) {
  @IsString()
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;
}
