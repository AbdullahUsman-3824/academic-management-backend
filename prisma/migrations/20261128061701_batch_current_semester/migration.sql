-- AlterTable
ALTER TABLE "batches" ADD COLUMN     "currentSemesterId" UUID;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_currentSemesterId_fkey" FOREIGN KEY ("currentSemesterId") REFERENCES "semesters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
