import { IsUUID, IsArray } from 'class-validator';

export class BulkAllocationDto {
  @IsUUID('4')
  facultyId!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  courseIds!: string[]; // Multiple courses for same teacher

  @IsUUID('4')
  sectionId!: string;

  // semesterNumber removed - automatically derived from section's current semester
  // academicSessionId removed - always uses active session from Academic Management
}
