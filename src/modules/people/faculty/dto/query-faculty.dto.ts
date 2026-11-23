import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryFacultyDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' || typeof value === 'number'
      ? parseInt(String(value), 10)
      : undefined,
  )
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' || typeof value === 'number'
      ? parseInt(String(value), 10)
      : undefined,
  )
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @IsString()
  designation?: string;
}
