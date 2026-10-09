/*
  Warnings:

  - You are about to drop the `academic_progressions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[course_id,faculty_id,section_id,academic_session_id]` on the table `course_allocations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[semester_id,course_id]` on the table `semester_courses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `semester_id` to the `course_allocations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `semester_id` to the `semester_courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `semester_id` to the `student_academic_records` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "AcademicSessionStatus" ADD VALUE 'INACTIVE';

-- DropForeignKey
ALTER TABLE "academic_progressions" DROP CONSTRAINT "academic_progressions_academicSessionId_fkey";

-- DropForeignKey
ALTER TABLE "academic_progressions" DROP CONSTRAINT "academic_progressions_createdById_fkey";

-- DropIndex
DROP INDEX "course_allocations_course_id_faculty_id_academic_session_id_key";

-- DropIndex
DROP INDEX "semester_courses_semester_number_course_id_key";

-- AlterTable
ALTER TABLE "course_allocations" ADD COLUMN     "semester_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "semester_courses" ADD COLUMN     "semester_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "student_academic_records" ADD COLUMN     "semester_id" UUID NOT NULL;

-- DropTable
DROP TABLE "academic_progressions";

-- DropEnum
DROP TYPE "ProgressionStatus";

-- CreateTable
CREATE TABLE "semesters" (
    "id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "min_credits" INTEGER NOT NULL DEFAULT 12,
    "max_credits" INTEGER NOT NULL DEFAULT 21,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "semesters_number_key" ON "semesters"("number");

-- CreateIndex
CREATE INDEX "course_allocations_faculty_id_academic_session_id_status_idx" ON "course_allocations"("faculty_id", "academic_session_id", "status");

-- CreateIndex
CREATE INDEX "course_allocations_section_id_semester_id_idx" ON "course_allocations"("section_id", "semester_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_allocations_course_id_faculty_id_section_id_academic_key" ON "course_allocations"("course_id", "faculty_id", "section_id", "academic_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "semester_courses_semester_id_course_id_key" ON "semester_courses"("semester_id", "course_id");

-- AddForeignKey
ALTER TABLE "student_academic_records" ADD CONSTRAINT "student_academic_records_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_allocations" ADD CONSTRAINT "course_allocations_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_courses" ADD CONSTRAINT "semester_courses_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
