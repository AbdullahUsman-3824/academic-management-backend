/*
  Warnings:

  - A unique constraint covering the columns `[batch_id,name]` on the table `sections` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `batch_id` to the `sections` table without a default value. This is not possible if the table is not empty.
  - Made the column `updated_at` on table `sections` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "batch_id" UUID NOT NULL,
ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "section_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "sections_batch_id_name_key" ON "sections"("batch_id", "name");

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
