// dto/implement-progression.dto.ts
import {
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProgressionAdjustmentDto {
  @IsUUID()
  studentId!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  targetSemester!: number;
}

export class ImplementProgressionDto {
  @IsUUID()
  academicSessionId!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgressionAdjustmentDto)
  @ArrayMinSize(0)
  adjustments?: ProgressionAdjustmentDto[];
}
