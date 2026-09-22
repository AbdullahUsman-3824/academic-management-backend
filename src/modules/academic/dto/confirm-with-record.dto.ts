import { IsEnum, IsArray, IsOptional, ValidateNested, IsUUID, IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum WithRecordMode {
  AUTO = 'auto',
  MANUAL = 'manual',
}

export class WithRecordAdjustmentDto {
  @IsUUID()
  studentId!: string;

  @IsInt()
  @Min(1)
  toSemester!: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ConfirmWithRecordDto {
  @IsEnum(WithRecordMode)
  mode!: WithRecordMode;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WithRecordAdjustmentDto)
  adjustments?: WithRecordAdjustmentDto[];
}
