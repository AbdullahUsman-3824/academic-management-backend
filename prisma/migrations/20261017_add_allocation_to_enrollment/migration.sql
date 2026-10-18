-- AlterTable: Add allocationId to course_enrollments for extra course tracking
ALTER TABLE "course_enrollments" 
ADD COLUMN "allocation_id" UUID;

-- CreateIndex: Add index for efficient allocation lookups
CREATE INDEX "course_enrollments_allocation_id_idx" ON "course_enrollments"("allocation_id");

-- AddForeignKey: Link enrollments to specific course allocations
ALTER TABLE "course_enrollments" 
ADD CONSTRAINT "course_enrollments_allocation_id_fkey" 
FOREIGN KEY ("allocation_id") REFERENCES "course_allocations"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Comment: This links extra course enrollments to specific teacher/section allocations
COMMENT ON COLUMN "course_enrollments"."allocation_id" IS 'Links extra course enrollments to specific teacher and section';
