import { StudentStatus } from '../enums/student-status.enum';

export interface StudentBatchSummary {
  id: string;
  name: string;
}

export interface StudentListItem {
  id: string;
  stdRegNumber: string;

  fullName: string;
  email?: string | null;
  phone?: string | null;

  batchName: string | null;
  currentSemester: number | null;
  currentSection: string | null;

  status: StudentStatus;
  admissionDate: Date | null;
}

export interface StudentDetail extends StudentListItem {
  // Personal information
  gender?: string | null;
  dateOfBirth?: Date | string | null;
  cnic?: string | null;
  profileImageUrl?: string | null;

  // Contact information
  address?: string | null;
  city?: string | null;

  // Guardian information
  guardianName?: string | null;
  guardianRelation?: string | null;
  guardianPhone?: string | null;
  guardianCnic?: string | null;

  // Account information
  username: string;
  accountStatus?: string | null;
  lastLoginAt?: Date | string | null;

  // Current academic placement
  currentAcademicSession?: string | null;

  // Audit information
  createdAt: Date | string;
  updatedAt: Date | string | null;
}

export interface PaginatedStudents {
  data: StudentListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BulkEnrollResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  errors: Array<{
    row: number;
    stdRegNumber: string | null;
    errors: string[];
  }>;
}

export interface StudentCourseOption {
  id: string;
  code: string;
  name: string;
}

export interface StudentCourseDetails extends StudentCourseOption {
  creditHours: number;
  facultyName: string | null;
}
