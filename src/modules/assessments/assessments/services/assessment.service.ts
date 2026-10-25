import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { CreateAssessmentDto, UpdateAssessmentDto } from '../dto/create-assessment.dto';
import { BulkMarkEntryDto, UpdateStudentMarkDto } from '../dto/student-marks.dto';

@Injectable()
export class AssessmentService {
  constructor(private prisma: PrismaService) {}

  // Get all assessment categories
  async getAssessmentCategories() {
    return this.prisma.assessmentCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  // Get assessments for a specific allocation (course)
  async getAssessmentsByAllocation(allocationId: string, facultyUserId: string) {
    // Verify faculty owns this allocation
    await this.verifyAllocationOwnership(allocationId, facultyUserId);

    return this.prisma.assessment.findMany({
      where: { courseAllocationId: allocationId },
      include: {
        assessmentCategory: true,
        _count: {
          select: { studentMarks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Create a new assessment
  async createAssessment(dto: CreateAssessmentDto, facultyUserId: string) {
    // Verify faculty owns this allocation
    await this.verifyAllocationOwnership(dto.courseAllocationId, facultyUserId);

    // Get faculty ID from user ID
    const faculty = await this.prisma.faculty.findUnique({
      where: { userId: facultyUserId },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty not found');
    }

    return this.prisma.assessment.create({
      data: {
        courseAllocationId: dto.courseAllocationId,
        assessmentCategoryId: dto.assessmentCategoryId,
        title: dto.title,
        totalMarks: dto.totalMarks,
        assessmentDate: dto.assessmentDate ? new Date(dto.assessmentDate) : null,
        createdBy: faculty.id,
        status: 'draft',
      },
      include: {
        assessmentCategory: true,
      },
    });
  }

  // Update assessment
  async updateAssessment(assessmentId: string, dto: UpdateAssessmentDto, facultyUserId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // Verify ownership
    await this.verifyAllocationOwnership(assessment.courseAllocationId, facultyUserId);

    // Cannot update submitted assessments
    if (assessment.status === 'submitted') {
      throw new BadRequestException('Cannot update submitted assessment');
    }

    return this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.totalMarks && { totalMarks: dto.totalMarks }),
        ...(dto.assessmentDate && { assessmentDate: new Date(dto.assessmentDate) }),
      },
      include: {
        assessmentCategory: true,
      },
    });
  }

  // Delete assessment
  async deleteAssessment(assessmentId: string, facultyUserId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // Verify ownership
    await this.verifyAllocationOwnership(assessment.courseAllocationId, facultyUserId);

    // Cannot delete submitted assessments
    if (assessment.status === 'submitted') {
      throw new BadRequestException('Cannot delete submitted assessment');
    }

    return this.prisma.assessment.delete({
      where: { id: assessmentId },
    });
  }

  // Get assessment details with student marks
  async getAssessmentDetails(assessmentId: string, facultyUserId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        assessmentCategory: true,
        courseAllocation: {
          include: {
            course: true,
            section: true,
            academicSession: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // Verify ownership
    await this.verifyAllocationOwnership(assessment.courseAllocationId, facultyUserId);

    // Get all enrolled students for this course allocation
    const students = await this.getEnrolledStudents(assessment.courseAllocationId);

    // Get marks for this assessment
    const marks = await this.prisma.studentMark.findMany({
      where: { assessmentId },
    });

    // Map marks to students
    const marksMap = new Map(marks.map(m => [m.studentId, m]));

    const studentsWithMarks = students.map(student => ({
      studentId: student.id,
      rollNumber: student.rollNumber,
      name: student.name,
      section: student.sectionName,
      mark: marksMap.get(student.id) || null,
    }));

    return {
      assessment,
      students: studentsWithMarks,
      statistics: {
        totalStudents: students.length,
        marksEntered: marks.length,
        pending: students.length - marks.length,
        averageMarks: marks.length > 0
          ? marks.reduce((sum, m) => sum + Number(m.marksObtained), 0) / marks.length
          : 0,
      },
    };
  }

  // Bulk mark entry
  async bulkMarkEntry(dto: BulkMarkEntryDto, facultyUserId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: dto.assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // Verify ownership
    await this.verifyAllocationOwnership(assessment.courseAllocationId, facultyUserId);

    // Get faculty ID
    const faculty = await this.prisma.faculty.findUnique({
      where: { userId: facultyUserId },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty not found');
    }

    // Validate marks against total marks
    for (const mark of dto.marks) {
      if (mark.marksObtained > Number(assessment.totalMarks)) {
        throw new BadRequestException(
          `Marks obtained (${mark.marksObtained}) cannot exceed total marks (${assessment.totalMarks})`
        );
      }
    }

    // Use transaction to create/update marks
    return this.prisma.$transaction(
      dto.marks.map(mark =>
        this.prisma.studentMark.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId: dto.assessmentId,
              studentId: mark.studentId,
            },
          },
          create: {
            assessmentId: dto.assessmentId,
            studentId: mark.studentId,
            marksObtained: mark.marksObtained,
            remarks: mark.remarks,
            enteredBy: faculty.id,
          },
          update: {
            marksObtained: mark.marksObtained,
            remarks: mark.remarks,
            updatedBy: faculty.id,
          },
        })
      )
    );
  }

  // Update single student mark
  async updateStudentMark(
    assessmentId: string,
    studentId: string,
    dto: UpdateStudentMarkDto,
    facultyUserId: string
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // Verify ownership
    await this.verifyAllocationOwnership(assessment.courseAllocationId, facultyUserId);

    // Validate marks
    if (dto.marksObtained > Number(assessment.totalMarks)) {
      throw new BadRequestException(
        `Marks obtained (${dto.marksObtained}) cannot exceed total marks (${assessment.totalMarks})`
      );
    }

    const faculty = await this.prisma.faculty.findUnique({
      where: { userId: facultyUserId },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty not found');
    }

    return this.prisma.studentMark.upsert({
      where: {
        assessmentId_studentId: {
          assessmentId,
          studentId,
        },
      },
      create: {
        assessmentId,
        studentId,
        marksObtained: dto.marksObtained,
        remarks: dto.remarks,
        enteredBy: faculty.id,
      },
      update: {
        marksObtained: dto.marksObtained,
        remarks: dto.remarks,
        updatedBy: faculty.id,
      },
    });
  }

  // Submit assessment (lock it)
  async submitAssessment(assessmentId: string, facultyUserId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // Verify ownership
    await this.verifyAllocationOwnership(assessment.courseAllocationId, facultyUserId);

    return this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
      },
    });
  }

  // Helper: Verify faculty owns the allocation
  private async verifyAllocationOwnership(allocationId: string, facultyUserId: string) {
    const faculty = await this.prisma.faculty.findUnique({
      where: { userId: facultyUserId },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty not found');
    }

    const allocation = await this.prisma.courseAllocation.findFirst({
      where: {
        id: allocationId,
        facultyId: faculty.id,
      },
    });

    if (!allocation) {
      throw new ForbiddenException('You do not have access to this course allocation');
    }

    return allocation;
  }

  // Helper: Get enrolled students for an allocation
  private async getEnrolledStudents(allocationId: string) {
    const allocation = await this.prisma.courseAllocation.findUnique({
      where: { id: allocationId },
      include: {
        section: true,
        course: true,
      },
    });

    if (!allocation) {
      throw new NotFoundException('Allocation not found');
    }

    // Get all academic records for this section and session
    const academicRecords = await this.prisma.studentAcademicRecord.findMany({
      where: {
        sectionId: allocation.sectionId,
        academicSessionId: allocation.academicSessionId,
        semesterNumber: allocation.semesterNumber,
      },
      include: {
        student: true,
      },
    });

    // Get course enrollments for these records
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: {
        courseId: allocation.courseId,
        studentAcademicRecordId: {
          in: academicRecords.map(r => r.id),
        },
      },
    });

    const enrolledRecordIds = new Set(enrollments.map(e => e.studentAcademicRecordId));

    // Filter records that have enrollments
    return academicRecords
      .filter(record => enrolledRecordIds.has(record.id))
      .map(record => ({
        id: record.student.id,
        rollNumber: record.student.stdRegNumber,
        name: `${record.student.firstName} ${record.student.middleName || ''} ${record.student.lastName || ''}`.trim(),
        sectionName: allocation.section.name,
      }));
  }
}
