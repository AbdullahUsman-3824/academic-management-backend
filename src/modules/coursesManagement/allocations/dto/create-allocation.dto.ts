import { IsUUID } from 'class-validator';

export class CreateAllocationDto {
  @IsUUID('4')
  facultyId!: string;

  @IsUUID('4')
  courseId!: string;

  @IsUUID('4')
  sectionId!: string;

  // semesterNumber removed - automatically derived from section's current semester
  // academicSessionId removed - always uses active session from Academic Management
}
