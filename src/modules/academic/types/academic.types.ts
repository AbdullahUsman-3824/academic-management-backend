export interface AcademicYear {
  name: string;
  startDate: Date;
  endDate: Date;
  status?: 'active' | 'inactive';
}

export interface AcademicSession {
  academicYearId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status?: 'upcoming' | 'ongoing' | 'completed';
}
