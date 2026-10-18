import { IsString, IsUUID, IsNumber, IsOptional, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class MarkEntryDto {
  @IsUUID()
  studentId: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  marksObtained: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class BulkMarkEntryDto {
  @IsUUID()
  assessmentId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarkEntryDto)
  marks: MarkEntryDto[];
}

export class UpdateStudentMarkDto {
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  marksObtained: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
