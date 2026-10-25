-- CreateEnum
CREATE TYPE "ProgressionStatus" AS ENUM ('draft', 'with_record_done', 'semester_assigned', 'sections_assigned', 'final_preview', 'locked', 'cancelled');

-- AlterTable
ALTER TABLE "academic_sessions" ADD COLUMN     "progressed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "academic_progressions" (
    "id" UUID NOT NULL,
    "academicSessionId" UUID NOT NULL,
    "status" "ProgressionStatus" NOT NULL DEFAULT 'draft',
    "currentStep" TEXT,
    "withRecordDecision" JSONB,
    "withoutRecordDecision" JSONB,
    "sectionDecision" JSONB,
    "previewCache" JSONB,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "academic_progressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academic_progressions_academicSessionId_idx" ON "academic_progressions"("academicSessionId");

-- CreateIndex
CREATE INDEX "academic_progressions_status_idx" ON "academic_progressions"("status");

-- AddForeignKey
ALTER TABLE "academic_progressions" ADD CONSTRAINT "academic_progressions_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_progressions" ADD CONSTRAINT "academic_progressions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
