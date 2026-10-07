import { IsUUID, IsOptional, IsString } from 'class-validator';

export class GetAllocationsQueryDto {
  @IsUUID('4')
  @IsOptional()
  facultyId?: string;

  @IsUUID('4')
  @IsOptional()
  sectionId?: string;

  @IsUUID('4')
  @IsOptional()
  semesterId?: string;

  @IsUUID('4')
  @IsOptional()
  academicSessionId?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
