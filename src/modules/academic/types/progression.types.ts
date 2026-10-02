export interface ProgressionStudentPreview {
  studentId: string;
  regNumber: string;
  fullName: string;
  batchId: string;
  batchName: string;
  currentSemester: number;
  targetSemester: number; // current + 1 (capped)
  currentSectionId: string | null;
  currentSectionName: string | null;
}

export interface ProgressionPreviewResponse {
  academicSessionId: string; // target session (the one we are progressing into)
  academicSessionName: string;
  totalStudents: number;
  students: ProgressionStudentPreview[];
}

export interface ImplementProgressionResponse {
  message: string;
  createdCount: number;
  academicSessionId: string;
}
