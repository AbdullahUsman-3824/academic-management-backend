/*
  Warnings:

  - The `status` column on the `academic_sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `academic_years` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `batches` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sections` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `student_academic_records` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AcademicYearStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AcademicSessionStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SectionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StudentAcademicRecordStatus" AS ENUM ('ENROLLED', 'PROMOTED', 'REPEATED', 'ON_PROBATION', 'SUSPENDED', 'GRADUATED', 'DROPPED_OUT');

-- AlterTable
ALTER TABLE "academic_sessions" DROP COLUMN "status",
ADD COLUMN     "status" "AcademicSessionStatus" NOT NULL DEFAULT 'UPCOMING';

-- AlterTable
ALTER TABLE "academic_years" DROP COLUMN "status",
ADD COLUMN     "status" "AcademicYearStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "batches" DROP COLUMN "status",
ADD COLUMN     "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "sections" DROP COLUMN "status",
ADD COLUMN     "status" "SectionStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "student_academic_records" DROP COLUMN "status",
ADD COLUMN     "status" "StudentAcademicRecordStatus" NOT NULL DEFAULT 'ENROLLED';
