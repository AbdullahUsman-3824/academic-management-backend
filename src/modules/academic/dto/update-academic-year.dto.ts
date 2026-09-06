import { PartialType } from '@nestjs/mapped-types';
import { CreateAcademicYearDto } from './create-academic.dto';

export class UpdateAcademicYearDto extends PartialType(CreateAcademicYearDto) {}
