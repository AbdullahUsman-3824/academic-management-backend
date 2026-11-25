import type {
  AcademicSessionStatus,
  BatchStatus,
  CourseAllocationStatus,
  CourseEnrollmentStatus,
  StudentAcademicRecordStatus,
} from '../../generated/prisma/enums';

/**
 * Central status constants for the course-management domain.
 *
 * NOTE: these values mirror the *stored* representation of each column and must
 * match what is already persisted. The casing differences are historical and are
 * intentional per column (academic enums are uppercase; course statuses are lowercase).
 * Centralising them here removes magic strings and makes the per-column casing
 * explicit so queries can't silently mix representations.
 */

// academic_sessions.status (enum AcademicSessionStatus — uppercase)
export const ACADEMIC_SESSION_STATUS = {
  UPCOMING: 'UPCOMING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const satisfies Record<
  'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
  AcademicSessionStatus
>;

// student_academic_records.status (enum StudentAcademicRecordStatus — uppercase)
export const STUDENT_RECORD_STATUS = {
  ENROLLED: 'ENROLLED',
} as const satisfies Record<'ENROLLED', StudentAcademicRecordStatus>;

export const BATCH_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const satisfies Record<'ACTIVE' | 'COMPLETED' | 'CANCELLED', BatchStatus>;

// course_allocations.status (enum — lowercase)
export const ALLOCATION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const satisfies Record<'ACTIVE' | 'INACTIVE', CourseAllocationStatus>;

// course_enrollments.status (enum — lowercase)
export const ENROLLMENT_STATUS = {
  ENROLLED: 'enrolled',
  DROPPED: 'dropped',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REAPPEAR: 'reappear',
} as const satisfies Record<
  'ENROLLED' | 'DROPPED' | 'COMPLETED' | 'FAILED' | 'REAPPEAR',
  CourseEnrollmentStatus
>;

// courses.status (plain string — lowercase)
export const COURSE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
