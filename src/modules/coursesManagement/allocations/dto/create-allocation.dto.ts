import { IsUUID } from 'class-validator';

export class CreateAllocationDto {
  @IsUUID()
  courseId!: string;

  @IsUUID()
  facultyId!: string;

  @IsUUID()
  academicSessionId!: string;

  @IsUUID()
  sectionId!: string;
}