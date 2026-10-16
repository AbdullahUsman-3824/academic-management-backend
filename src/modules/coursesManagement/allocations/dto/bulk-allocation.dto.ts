import { IsUUID, IsOptional, IsArray, IsInt, Min, Max } from 'class-validator';

export class BulkAllocationDto {
  @IsUUID('4')
  facultyId!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  courseIds!: string[]; // Multiple courses for same teacher

  @IsUUID('4')
  sectionId!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  semesterNumber!: number; // Changed from semesterId to semesterNumber

  @IsUUID('4')
  @IsOptional()
  academicSessionId?: string;
}
