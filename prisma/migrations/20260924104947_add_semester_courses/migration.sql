/*
  Warnings:

  - The primary key for the `academic_progressions` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "academic_progressions" DROP CONSTRAINT "academic_progressions_createdById_fkey";

-- AlterTable
ALTER TABLE "academic_progressions" DROP CONSTRAINT "academic_progressions_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "createdById" SET DATA TYPE TEXT,
ADD CONSTRAINT "academic_progressions_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "semester_courses" (
    "id" UUID NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "course_id" UUID NOT NULL,
    "is_compulsory" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "semester_courses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "semester_courses_semester_number_course_id_key" ON "semester_courses"("semester_number", "course_id");

-- AddForeignKey
ALTER TABLE "semester_courses" ADD CONSTRAINT "semester_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
