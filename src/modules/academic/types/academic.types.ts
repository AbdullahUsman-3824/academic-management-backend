import {
  AcademicYearStatus,
  AcademicSessionStatus,
  BatchStatus,
} from '../../../generated/prisma/client';

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

export interface BatchEntity {
  id: string;
  name: string;
  entryYearId: string;
  programDuration: number;
  sectionCapacity: number | null;
  status: BatchStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MappedBatchResponse {
  id: string;
  name: string;
  entryYearId: string;
  startDate: Date;
  endDate: Date;
  status: BatchStatus;
  counts?: {
    students: number;
    sections: number;
  };
}

export interface SetupResponse {
  academicYear: AcademicYearResponse;
  academicSessions: AcademicSessionResponse[];
  batch: BatchEntity;
}
