import {
  AcademicYearStatus,
  AcademicSessionStatus,
  BatchStatus,
} from '../enums/academic-status.enum';

export interface AcademicYearResponse {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: AcademicYearStatus;
}

export interface AcademicSessionResponse {
  id: string;
  academicYearId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: AcademicSessionStatus;
}

export interface BatchResponse {
  id: string;
  name: string;
  startDate: Date;
  endDate?: Date;
  status: BatchStatus;
}

export interface SetupResponse {
  academicYear: AcademicYearResponse;
  academicSessions: AcademicSessionResponse[];
  batch: BatchResponse;
}
