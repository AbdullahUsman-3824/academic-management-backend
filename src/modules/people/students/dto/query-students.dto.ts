import { IsOptional, IsString, IsInt, Min, IsUUID, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { StudentStatus } from '../enums/student-status.enum';

export class QueryStudentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @IsOptional()
  @IsUUID()
  batchId?: string;
}