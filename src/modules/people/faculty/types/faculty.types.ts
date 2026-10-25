export interface FacultyListItem {
  id: string;
  employeeNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  qualification?: string | null;
  joiningDate?: Date | null;
  status: string;
  createdAt: Date;
}

export interface FacultyDetail extends FacultyListItem {
  dateOfBirth?: Date | null;
  gender?: string | null;
  cnic?: string | null;
  profileImageUrl?: string | null;
  address?: string | null;
  city?: string | null;
  updatedAt?: Date | null;
  user?: {
    id: string;
    username: string;
  };
}

export interface PaginatedFaculty {
  data: FacultyListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TeachingLoad {
  allocations: any[];
  totalCourses: number;
  totalCreditHours: number;
}
