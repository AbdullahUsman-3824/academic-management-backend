import {
  IsInt,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BatchSemesterOverrideDto {
  @IsUUID()
  batchId!: string;

  @IsInt()
  @Min(1)
  semester!: number;
}

export class StudentSemesterOverrideDto {
  @IsUUID()
  studentId!: string;

  @IsInt()
  @Min(1)
  semester!: number;
}

export class AssignSemesterDto {
  /** Default semester for all new students (those without any prior academic record). */
  @IsInt()
  @Min(1)
  defaultSemester!: number;

  /** Override the default semester for a whole batch. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchSemesterOverrideDto)
  batchOverrides?: BatchSemesterOverrideDto[];

  /** Override per individual student — takes priority over batchOverrides. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentSemesterOverrideDto)
  studentOverrides?: StudentSemesterOverrideDto[];
}
