import { IsUUID, IsOptional, IsArray } from 'class-validator';

export class BulkAllocationDto {
  @IsUUID('4')
  facultyId!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  courseIds!: string[]; // Multiple courses for same teacher

  @IsUUID('4')
  sectionId!: string;

  @IsUUID('4')
  semesterId!: string;

  @IsUUID('4')
  @IsOptional()
  academicSessionId?: string;
}
