import { IsEnum } from 'class-validator';
import { CourseStatus } from '../enums/course-status.enum';

export class UpdateCourseStatusDto {
  @IsEnum(CourseStatus)
  status!: CourseStatus;
}
