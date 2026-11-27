-- CreateEnum
CREATE TYPE "BatchSemesterStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "batch_semesters" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "semester_id" UUID NOT NULL,
    "status" "BatchSemesterStatus" NOT NULL DEFAULT 'UPCOMING',
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "batch_semesters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "batch_semesters_batch_id_semester_id_key" ON "batch_semesters"("batch_id", "semester_id");

-- AddForeignKey
ALTER TABLE "batch_semesters" ADD CONSTRAINT "batch_semesters_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_semesters" ADD CONSTRAINT "batch_semesters_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
