import { StudentStatus, Gender } from '../enums/student-status.enum';
export interface StudentBatchSummary {
  id: string;
  name: string;
}

export interface StudentListItem {
  id: string;
  userId: string;
  username: string;
  stdRegNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: Gender | string | null;
  batch: StudentBatchSummary | null;
  status: StudentStatus | string;
  admissionDate: Date | string | null;
}

export interface StudentDetail extends StudentListItem {
  dateOfBirth?: Date | string | null;
  cnic?: string | null;
  profileImageUrl?: string | null;
  address?: string | null;
  city?: string | null;
  guardianName?: string | null;
  guardianRelation?: string | null;
  guardianPhone?: string | null;
  guardianCnic?: string | null;
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
