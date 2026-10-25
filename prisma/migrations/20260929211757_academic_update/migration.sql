/*
  Warnings:

  - The primary key for the `academic_progressions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `academic_progressions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `status` on the `sections` table. All the data in the column will be lost.
  - You are about to drop the column `section_id` on the `students` table. All the data in the column will be lost.
  - Changed the type of `id` on the `academic_progressions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_section_id_fkey";

-- AlterTable
ALTER TABLE "academic_progressions" DROP CONSTRAINT "academic_progressions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
ADD CONSTRAINT "academic_progressions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "sections" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "students" DROP COLUMN "section_id";

-- DropEnum
DROP TYPE "SectionStatus";

-- AddForeignKey
ALTER TABLE "academic_progressions" ADD CONSTRAINT "academic_progressions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
