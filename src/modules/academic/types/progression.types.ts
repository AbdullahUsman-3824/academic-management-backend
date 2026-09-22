import { ProgressionStatus } from '../../../generated/prisma/enums';
import { WithRecordMode } from '../dto/confirm-with-record.dto';
import { SectionStrategy } from '../dto/assign-sections.dto';

// ─── Stored JSON shapes (what goes into the DB columns) ──────────────────────

export interface WithRecordAdjustment {
  studentId: string;
  toSemester: number;
  reason?: string;
}

export interface StoredWithRecordDecision {
  mode: WithRecordMode;
  adjustments?: WithRecordAdjustment[];
}

export interface BatchSemesterOverride {
  batchId: string;
  semester: number;
}

export interface StudentSemesterOverride {
  studentId: string;
  semester: number;
}

export interface StoredWithoutRecordDecision {
  defaultSemester: number;
  batchOverrides?: BatchSemesterOverride[];
  studentOverrides?: StudentSemesterOverride[];
}

export interface StoredSectionSlot {
  sectionId?: string;
  name?: string;
  studentCount: number;
}

export interface StoredBatchSectionSplit {
  batchId: string;
  sections: StoredSectionSlot[];
}

export interface StoredSectionDecision {
  strategy: SectionStrategy;
  customSplits?: StoredBatchSectionSplit[];
}

// ─── Preview shapes (returned to the client) ─────────────────────────────────

export interface StudentPreviewItem {
  studentId: string;
  regNumber: string;
  fullName: string;
  currentSemester: number | null;
  targetSemester: number;
  sectionId?: string;
  sectionName?: string;
}

export interface BatchProgressionSummary {
  batchId: string;
  batchName: string;
  withRecordCount: number;
  withoutRecordCount: number;
  /** Students who have a prior record and their computed target semesters */
  withRecordStudents: StudentPreviewItem[];
  /** Students without any prior record */
  withoutRecordStudents: StudentPreviewItem[];
}

export interface ProgressionPreviewResponse {
  progressionId: string;
  academicSessionId: string;
  status: ProgressionStatus;
  totalWithRecord: number;
  totalWithoutRecord: number;
  batches: BatchProgressionSummary[];
}

export interface FinalPreviewResponse extends ProgressionPreviewResponse {
  sectionBreakdown: BatchSectionBreakdown[];
}

export interface BatchSectionBreakdown {
  batchId: string;
  batchName: string;
  strategy: SectionStrategy;
  sections: SectionAssignment[];
}

export interface SectionAssignment {
  sectionId?: string;
  sectionName: string;
  students: { studentId: string; regNumber: string; fullName: string }[];
}

// ─── Check endpoint response ──────────────────────────────────────────────────

export interface ProgressionCheckResponse {
  canStart: boolean;
  reason?: string;
  activeSession?: { id: string; name: string };
  existingProgression?: {
    id: string;
    status: ProgressionStatus;
    currentStep: string | null;
  };
}

// ─── Start endpoint response ──────────────────────────────────────────────────

export interface ProgressionStartResponse {
  id: string;
  academicSessionId: string;
  status: ProgressionStatus;
  currentStep: string | null;
  isResumed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
