export const ROLES = {
  ADMIN: 'admin',
  STUDENT: 'student',
  FACULTY: 'faculty',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
