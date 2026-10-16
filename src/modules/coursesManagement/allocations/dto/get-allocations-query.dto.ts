import { IsUUID, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAllocationsQueryDto {
  @IsUUID('4')
  @IsOptional()
  facultyId?: string;

  @IsUUID('4')
  @IsOptional()
  sectionId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  semesterNumber?: number; // Changed from semesterId to semesterNumber

  @IsUUID('4')
  @IsOptional()
  academicSessionId?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
