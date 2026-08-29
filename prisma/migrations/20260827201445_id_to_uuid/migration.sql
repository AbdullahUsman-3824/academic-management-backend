/*
  Warnings:

  - The primary key for the `academic_sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `academic_years` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `assessment_categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `assessments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `batches` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `course_allocations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `course_enrollments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `courses` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `faculties` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `grade_scales` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `sections` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `student_academic_records` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `student_course_results` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `finalized_by` column on the `student_course_results` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `student_marks` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `entered_by` column on the `student_marks` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by` column on the `student_marks` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `students` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `academic_sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `academic_year_id` on the `academic_sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `academic_years` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `assessment_categories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `assessments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `course_allocation_id` on the `assessments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `assessment_category_id` on the `assessments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `created_by` on the `assessments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `batches` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `course_allocations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `course_id` on the `course_allocations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `faculty_id` on the `course_allocations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `academic_session_id` on the `course_allocations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `section_id` on the `course_allocations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `course_enrollments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `student_academic_record_id` on the `course_enrollments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `course_id` on the `course_enrollments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `courses` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `faculties` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `faculties` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `grade_scales` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `role_id` on the `role_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `permission_id` on the `role_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `sections` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `student_academic_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `student_id` on the `student_academic_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `academic_session_id` on the `student_academic_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `section_id` on the `student_academic_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `student_course_results` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `student_id` on the `student_course_results` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `course_enrollment_id` on the `student_course_results` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `course_id` on the `student_course_results` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `academic_session_id` on the `student_course_results` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `student_marks` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `assessment_id` on the `student_marks` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `student_id` on the `student_marks` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `students` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `students` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `batch_id` on the `students` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `role_id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "academic_sessions" DROP CONSTRAINT "academic_sessions_academic_year_id_fkey";

-- DropForeignKey
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_assessment_category_id_fkey";

-- DropForeignKey
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_course_allocation_id_fkey";

-- DropForeignKey
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_created_by_fkey";

-- DropForeignKey
ALTER TABLE "course_allocations" DROP CONSTRAINT "course_allocations_academic_session_id_fkey";

-- DropForeignKey
ALTER TABLE "course_allocations" DROP CONSTRAINT "course_allocations_course_id_fkey";

-- DropForeignKey
ALTER TABLE "course_allocations" DROP CONSTRAINT "course_allocations_faculty_id_fkey";

-- DropForeignKey
ALTER TABLE "course_allocations" DROP CONSTRAINT "course_allocations_section_id_fkey";

-- DropForeignKey
ALTER TABLE "course_enrollments" DROP CONSTRAINT "course_enrollments_course_id_fkey";

-- DropForeignKey
ALTER TABLE "course_enrollments" DROP CONSTRAINT "course_enrollments_student_academic_record_id_fkey";

-- DropForeignKey
ALTER TABLE "faculties" DROP CONSTRAINT "faculties_user_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_role_id_fkey";

-- DropForeignKey
ALTER TABLE "student_academic_records" DROP CONSTRAINT "student_academic_records_academic_session_id_fkey";

-- DropForeignKey
ALTER TABLE "student_academic_records" DROP CONSTRAINT "student_academic_records_section_id_fkey";

-- DropForeignKey
ALTER TABLE "student_academic_records" DROP CONSTRAINT "student_academic_records_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_course_results" DROP CONSTRAINT "student_course_results_academic_session_id_fkey";

-- DropForeignKey
ALTER TABLE "student_course_results" DROP CONSTRAINT "student_course_results_course_enrollment_id_fkey";

-- DropForeignKey
ALTER TABLE "student_course_results" DROP CONSTRAINT "student_course_results_course_id_fkey";

-- DropForeignKey
ALTER TABLE "student_course_results" DROP CONSTRAINT "student_course_results_finalized_by_fkey";

-- DropForeignKey
ALTER TABLE "student_course_results" DROP CONSTRAINT "student_course_results_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_marks" DROP CONSTRAINT "student_marks_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "student_marks" DROP CONSTRAINT "student_marks_entered_by_fkey";

-- DropForeignKey
ALTER TABLE "student_marks" DROP CONSTRAINT "student_marks_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_marks" DROP CONSTRAINT "student_marks_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_batch_id_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_user_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_role_id_fkey";

-- AlterTable
ALTER TABLE "academic_sessions" DROP CONSTRAINT "academic_sessions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "academic_year_id",
ADD COLUMN     "academic_year_id" UUID NOT NULL,
ADD CONSTRAINT "academic_sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "academic_years" DROP CONSTRAINT "academic_years_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "assessment_categories" DROP CONSTRAINT "assessment_categories_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "assessment_categories_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "course_allocation_id",
ADD COLUMN     "course_allocation_id" UUID NOT NULL,
DROP COLUMN "assessment_category_id",
ADD COLUMN     "assessment_category_id" UUID NOT NULL,
DROP COLUMN "created_by",
ADD COLUMN     "created_by" UUID NOT NULL,
ADD CONSTRAINT "assessments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "batches" DROP CONSTRAINT "batches_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "batches_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "course_allocations" DROP CONSTRAINT "course_allocations_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "course_id",
ADD COLUMN     "course_id" UUID NOT NULL,
DROP COLUMN "faculty_id",
ADD COLUMN     "faculty_id" UUID NOT NULL,
DROP COLUMN "academic_session_id",
ADD COLUMN     "academic_session_id" UUID NOT NULL,
DROP COLUMN "section_id",
ADD COLUMN     "section_id" UUID NOT NULL,
ADD CONSTRAINT "course_allocations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "course_enrollments" DROP CONSTRAINT "course_enrollments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "student_academic_record_id",
ADD COLUMN     "student_academic_record_id" UUID NOT NULL,
DROP COLUMN "course_id",
ADD COLUMN     "course_id" UUID NOT NULL,
ADD CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "courses" DROP CONSTRAINT "courses_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "faculties" DROP CONSTRAINT "faculties_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "faculties_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "grade_scales" DROP CONSTRAINT "grade_scales_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "grade_scales_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "role_permissions" DROP COLUMN "role_id",
ADD COLUMN     "role_id" UUID NOT NULL,
DROP COLUMN "permission_id",
ADD COLUMN     "permission_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "roles" DROP CONSTRAINT "roles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "sections" DROP CONSTRAINT "sections_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "sections_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "student_academic_records" DROP CONSTRAINT "student_academic_records_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "student_id",
ADD COLUMN     "student_id" UUID NOT NULL,
DROP COLUMN "academic_session_id",
ADD COLUMN     "academic_session_id" UUID NOT NULL,
DROP COLUMN "section_id",
ADD COLUMN     "section_id" UUID NOT NULL,
ADD CONSTRAINT "student_academic_records_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "student_course_results" DROP CONSTRAINT "student_course_results_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "student_id",
ADD COLUMN     "student_id" UUID NOT NULL,
DROP COLUMN "course_enrollment_id",
ADD COLUMN     "course_enrollment_id" UUID NOT NULL,
DROP COLUMN "course_id",
ADD COLUMN     "course_id" UUID NOT NULL,
DROP COLUMN "academic_session_id",
ADD COLUMN     "academic_session_id" UUID NOT NULL,
DROP COLUMN "finalized_by",
ADD COLUMN     "finalized_by" UUID,
ADD CONSTRAINT "student_course_results_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "student_marks" DROP CONSTRAINT "student_marks_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "assessment_id",
ADD COLUMN     "assessment_id" UUID NOT NULL,
DROP COLUMN "student_id",
ADD COLUMN     "student_id" UUID NOT NULL,
DROP COLUMN "entered_by",
ADD COLUMN     "entered_by" UUID,
DROP COLUMN "updated_by",
ADD COLUMN     "updated_by" UUID,
ADD CONSTRAINT "student_marks_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "students" DROP CONSTRAINT "students_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
DROP COLUMN "batch_id",
ADD COLUMN     "batch_id" UUID NOT NULL,
ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "role_id",
ADD COLUMN     "role_id" UUID NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "course_allocations_course_id_faculty_id_academic_session_id_key" ON "course_allocations"("course_id", "faculty_id", "academic_session_id", "section_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_student_academic_record_id_course_id_key" ON "course_enrollments"("student_academic_record_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "faculties_user_id_key" ON "faculties"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_academic_records_student_id_academic_session_id_key" ON "student_academic_records"("student_id", "academic_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_course_results_student_id_course_enrollment_id_key" ON "student_course_results"("student_id", "course_enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_marks_assessment_id_student_id_key" ON "student_marks"("assessment_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- AddForeignKey
ALTER TABLE "academic_sessions" ADD CONSTRAINT "academic_sessions_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_academic_records" ADD CONSTRAINT "student_academic_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_academic_records" ADD CONSTRAINT "student_academic_records_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_academic_records" ADD CONSTRAINT "student_academic_records_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_course_allocation_id_fkey" FOREIGN KEY ("course_allocation_id") REFERENCES "course_allocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_assessment_category_id_fkey" FOREIGN KEY ("assessment_category_id") REFERENCES "assessment_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_marks" ADD CONSTRAINT "student_marks_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_marks" ADD CONSTRAINT "student_marks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_marks" ADD CONSTRAINT "student_marks_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "faculties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_marks" ADD CONSTRAINT "student_marks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "faculties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_course_results" ADD CONSTRAINT "student_course_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_course_results" ADD CONSTRAINT "student_course_results_course_enrollment_id_fkey" FOREIGN KEY ("course_enrollment_id") REFERENCES "course_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_course_results" ADD CONSTRAINT "student_course_results_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_course_results" ADD CONSTRAINT "student_course_results_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_course_results" ADD CONSTRAINT "student_course_results_finalized_by_fkey" FOREIGN KEY ("finalized_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_student_academic_record_id_fkey" FOREIGN KEY ("student_academic_record_id") REFERENCES "student_academic_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_allocations" ADD CONSTRAINT "course_allocations_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_allocations" ADD CONSTRAINT "course_allocations_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_allocations" ADD CONSTRAINT "course_allocations_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_allocations" ADD CONSTRAINT "course_allocations_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculties" ADD CONSTRAINT "faculties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
