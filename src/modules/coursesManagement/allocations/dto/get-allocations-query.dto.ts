import { IsUUID, IsOptional, IsString, IsInt, IsBoolean, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

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

  // Optional explicit session scope; defaults to the active session (#14)
  @IsUUID('4')
  @IsOptional()
  academicSessionId?: string;

  // Set true to include ALL sessions (historical view) instead of forcing active (#14)
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  allSessions?: boolean;

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
