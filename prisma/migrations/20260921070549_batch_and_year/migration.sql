/*
  Warnings:

  - You are about to drop the column `end_date` on the `batches` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `batches` table. All the data in the column will be lost.
  - Added the required column `entry_year_id` to the `batches` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `batches` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batch_id` to the `student_academic_records` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "batches" DROP COLUMN "end_date",
DROP COLUMN "start_date",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "entry_year_id" UUID NOT NULL,
ADD COLUMN     "program_duration" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "student_academic_records" ADD COLUMN     "batch_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "batches_entry_year_id_idx" ON "batches"("entry_year_id");

-- CreateIndex
CREATE INDEX "student_academic_records_batch_id_section_id_idx" ON "student_academic_records"("batch_id", "section_id");

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_entry_year_id_fkey" FOREIGN KEY ("entry_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_academic_records" ADD CONSTRAINT "student_academic_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
