import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
  IsOptional,
} from 'class-validator';

export class CurriculumCourseDto {
  @IsUUID()
  courseId!: string;

  @IsInt()
  @Min(1)
  displayOrder!: number;
}

export class CurriculumSemesterDto {
  @IsUUID()
  semesterId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurriculumCourseDto)
  courses!: CurriculumCourseDto[];
}

export class SaveCurriculumDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurriculumSemesterDto)
  semesters!: CurriculumSemesterDto[];
}

export class CopyCurriculumPreviewQueryDto {
  @IsUUID()
  sourceBatchId!: string;

  @IsUUID()
  @IsOptional()
  semesterId?: string;
}
