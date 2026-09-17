import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  creditHours!: number;
}
