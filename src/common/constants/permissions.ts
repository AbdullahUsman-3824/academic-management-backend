export const PERMISSIONS = {
  // =====================================================
  // Authentication & User Management
  // =====================================================

  // Roles
  ROLE_CREATE: 'role:create',
  ROLE_READ: 'role:read',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',

  // Permissions
  PERMISSION_CREATE: 'permission:create',
  PERMISSION_READ: 'permission:read',
  PERMISSION_UPDATE: 'permission:update',
  PERMISSION_DELETE: 'permission:delete',

  // Users
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // =====================================================
  // Student & Faculty Management
  // =====================================================

  // Students
  STUDENT_CREATE: 'student:create',
  STUDENT_READ: 'student:read',
  STUDENT_UPDATE: 'student:update',
  STUDENT_DELETE: 'student:delete',

  // Faculty
  FACULTY_CREATE: 'faculty:create',
  FACULTY_READ: 'faculty:read',
  FACULTY_UPDATE: 'faculty:update',
  FACULTY_DELETE: 'faculty:delete',

  // =====================================================
  // Academic Structure
  // =====================================================

  // Academic Years
  ACADEMIC_YEAR_CREATE: 'academic_year:create',
  ACADEMIC_YEAR_READ: 'academic_year:read',
  ACADEMIC_YEAR_UPDATE: 'academic_year:update',
  ACADEMIC_YEAR_DELETE: 'academic_year:delete',

  // Academic Sessions
  ACADEMIC_SESSION_CREATE: 'academic_session:create',
  ACADEMIC_SESSION_READ: 'academic_session:read',
  ACADEMIC_SESSION_UPDATE: 'academic_session:update',
  ACADEMIC_SESSION_DELETE: 'academic_session:delete',

  // Batches
  BATCH_CREATE: 'batch:create',
  BATCH_READ: 'batch:read',
  BATCH_UPDATE: 'batch:update',
  BATCH_DELETE: 'batch:delete',

  // Sections
  SECTION_CREATE: 'section:create',
  SECTION_READ: 'section:read',
  SECTION_UPDATE: 'section:update',
  SECTION_DELETE: 'section:delete',

  // Student Academic Records
  STUDENT_ACADEMIC_RECORD_CREATE: 'student_academic_record:create',
  STUDENT_ACADEMIC_RECORD_READ: 'student_academic_record:read',
  STUDENT_ACADEMIC_RECORD_UPDATE: 'student_academic_record:update',
  STUDENT_ACADEMIC_RECORD_DELETE: 'student_academic_record:delete',

  // =====================================================
  // Course Management
  // =====================================================

  // Courses
  COURSE_CREATE: 'course:create',
  COURSE_READ: 'course:read',
  COURSE_UPDATE: 'course:update',
  COURSE_DELETE: 'course:delete',

  // Course Enrollments
  COURSE_ENROLLMENT_CREATE: 'course_enrollment:create',
  COURSE_ENROLLMENT_READ: 'course_enrollment:read',
  COURSE_ENROLLMENT_UPDATE: 'course_enrollment:update',
  COURSE_ENROLLMENT_DELETE: 'course_enrollment:delete',

  // Course Allocations
  COURSE_ALLOCATION_CREATE: 'course_allocation:create',
  COURSE_ALLOCATION_READ: 'course_allocation:read',
  COURSE_ALLOCATION_UPDATE: 'course_allocation:update',
  COURSE_ALLOCATION_DELETE: 'course_allocation:delete',

  // =====================================================
  // Assessment & Result Management
  // =====================================================

  // Assessment Categories
  ASSESSMENT_CATEGORY_CREATE: 'assessment_category:create',
  ASSESSMENT_CATEGORY_READ: 'assessment_category:read',
  ASSESSMENT_CATEGORY_UPDATE: 'assessment_category:update',
  ASSESSMENT_CATEGORY_DELETE: 'assessment_category:delete',

  // Assessments
  ASSESSMENT_CREATE: 'assessment:create',
  ASSESSMENT_READ: 'assessment:read',
  ASSESSMENT_UPDATE: 'assessment:update',
  ASSESSMENT_DELETE: 'assessment:delete',
  ASSESSMENT_SUBMIT: 'assessment:submit',

  // Student Marks
  STUDENT_MARK_CREATE: 'student_mark:create',
  STUDENT_MARK_READ: 'student_mark:read',
  STUDENT_MARK_UPDATE: 'student_mark:update',
  STUDENT_MARK_DELETE: 'student_mark:delete',

  // Student Course Results
  STUDENT_COURSE_RESULT_CREATE: 'student_course_result:create',
  STUDENT_COURSE_RESULT_READ: 'student_course_result:read',
  STUDENT_COURSE_RESULT_UPDATE: 'student_course_result:update',
  STUDENT_COURSE_RESULT_DELETE: 'student_course_result:delete',
  STUDENT_COURSE_RESULT_FINALIZE: 'student_course_result:finalize',

  // Grade Scales
  GRADE_SCALE_CREATE: 'grade_scale:create',
  GRADE_SCALE_READ: 'grade_scale:read',
  GRADE_SCALE_UPDATE: 'grade_scale:update',
  GRADE_SCALE_DELETE: 'grade_scale:delete',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type PermissionName = keyof typeof PERMISSIONS;

export default PERMISSIONS;
