export interface ProgressionStudentPreview {
  studentId: string;
  regNumber: string;
  fullName: string;
  currentSectionId: string | null;
  currentSectionName: string | null;
}

export interface ProgressionTransitionPreview {
  fromSemester: number;
  fromSemesterId: string | null;
  fromSemesterName: string | null;
  toSemester: number;
  toSemesterId: string | null;
  toSemesterName: string | null;
  isFinal: boolean; // from === to (last semester, stays same)
  missingTargetSemester: boolean; // target semester DB me seed nahi hai
  count: number;
  students: ProgressionStudentPreview[];
}

export interface ProgressionBatchPreview {
  batchId: string;
  batchName: string;
  totalStudents: number;
  transitions: ProgressionTransitionPreview[];
}

export interface ProgressionPreviewResponse {
  academicSessionId: string;
  academicSessionName: string;
  totalStudents: number;
  totalBatches: number;
  batches: ProgressionBatchPreview[];
}

export interface ImplementProgressionResponse {
  message: string;
  createdCount: number;
  skippedCount: number;
  academicSessionId: string;
}
