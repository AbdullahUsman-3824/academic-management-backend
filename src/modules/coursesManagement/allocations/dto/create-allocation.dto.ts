import { IsUUID, IsOptional } from 'class-validator';

export class CreateAllocationDto {
  @IsUUID('4')
  facultyId!: string;

  @IsUUID('4')
  courseId!: string;

  @IsUUID('4')
  sectionId!: string;

  @IsUUID('4')
  semesterId!: string; // REQUIRED in UI

  @IsUUID('4')
  @IsOptional()
  academicSessionId?: string; // Optional - defaults to active session
}
