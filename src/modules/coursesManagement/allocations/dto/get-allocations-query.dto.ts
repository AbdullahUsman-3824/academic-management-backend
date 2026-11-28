import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { CourseAllocationStatus } from '../../../../generated/prisma/enums';

export class GetAllocationsQueryDto {
  @IsUUID('4')
  @IsOptional()
  sessionId?: string;

  @IsUUID('4')
  @IsOptional()
  facultyId?: string;

  @IsUUID('4')
  @IsOptional()
  sectionId?: string;

  @IsUUID('4')
  @IsOptional()
  batchId?: string;

  @IsEnum(CourseAllocationStatus)
  @IsOptional()
  status?: CourseAllocationStatus;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
