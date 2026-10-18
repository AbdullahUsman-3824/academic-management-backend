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

  // academicSessionId removed - queries always use active session

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
