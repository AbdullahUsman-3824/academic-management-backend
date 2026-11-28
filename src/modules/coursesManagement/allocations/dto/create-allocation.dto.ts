import { IsUUID } from 'class-validator';

export class CreateAllocationDto {
  @IsUUID('4')
  batchCourseAssignmentId!: string;

  @IsUUID('4')
  facultyId!: string;

  @IsUUID('4')
  sectionId!: string;
}
