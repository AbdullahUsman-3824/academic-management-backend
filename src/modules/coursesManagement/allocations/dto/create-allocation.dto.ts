import { IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateAllocationDto {
  @IsUUID('4')
  facultyId!: string;

  @IsUUID('4')
  courseId!: string;

  @IsUUID('4')
  sectionId!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  semesterNumber!: number; // Changed from semesterId to semesterNumber

  @IsUUID('4')
  @IsOptional()
  academicSessionId?: string; // Optional - defaults to active session
}
