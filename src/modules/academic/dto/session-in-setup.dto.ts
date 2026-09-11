import { OmitType } from '@nestjs/mapped-types';
import { CreateAcademicSessionDto } from './create-academic-session.dto';

export class SessionInSetupDto extends OmitType(CreateAcademicSessionDto, [
  'academicYearId',
] as const) {}
