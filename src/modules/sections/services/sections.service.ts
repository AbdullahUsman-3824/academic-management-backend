import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service'; // ← adjust path if needed
import {
  AutoCreateSectionsDto,
  MoveStudentsDto,
  ManualAssignDto,
} from '../dto/section.dto';

@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // Ensure default section exists
  // ─────────────────────────────────────────────
  async ensureDefaultSection(batchId: string) {
    let section = await this.prisma.section.findFirst({
      where: { batchId, isDefault: true },
    });

    if (!section) {
      section = await this.prisma.section.create({
        data: {
          batchId,
          name: '__DEFAULT__',
          isDefault: true,
          status: 'ACTIVE',
        },
      });
    }
    return section;
  }

  // ─────────────────────────────────────────────
  // List real sections of a batch
  // ─────────────────────────────────────────────
  async listSections(batchId: string) {
    const sections = await this.prisma.section.findMany({
      where: {
        batchId,
        isDefault: false,
        status: 'ACTIVE',
      },
      include: {
        _count: { select: { students: true } },
      },
      orderBy: { name: 'asc' },
    });

    return sections.map((s) => ({
      id: s.id,
      name: s.name,
      studentCount: s._count.students,
      status: s.status,
    }));
  }

  // ─────────────────────────────────────────────
  // Students still in default (unassigned)
  // ─────────────────────────────────────────────
  async getStudentsInDefault(batchId: string) {
    const defaultSection = await this.ensureDefaultSection(batchId);

    const students = await this.prisma.student.findMany({
      where: {
        batchId,
        OR: [{ sectionId: defaultSection.id }, { sectionId: null }],
        status: 'active',
      },
      select: {
        id: true,
        stdRegNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
      },
      orderBy: { stdRegNumber: 'asc' },
    });

    return students.map((s) => ({
      studentId: s.id,
      regNumber: s.stdRegNumber,
      fullName: [s.firstName, s.middleName, s.lastName]
        .filter(Boolean)
        .join(' '),
    }));
  }

  // ─────────────────────────────────────────────
  // AUTOMATIC: Create sections based on capacity
  // ─────────────────────────────────────────────
  async autoCreateSections(batchId: string, dto: AutoCreateSectionsDto) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    const capacity = dto.capacity || batch.sectionCapacity;

    if (!capacity || capacity < 1) {
      throw new BadRequestException(
        'Section capacity is required. Set it on the batch or send it in the request.',
      );
    }

    const defaultSection = await this.ensureDefaultSection(batchId);

    const unassignedStudents = await this.prisma.student.findMany({
      where: {
        batchId,
        OR: [{ sectionId: defaultSection.id }, { sectionId: null }],
        status: 'active',
      },
      orderBy: { stdRegNumber: 'asc' },
      select: { id: true },
    });

    if (unassignedStudents.length === 0) {
      throw new BadRequestException(
        'No unassigned students found in this batch',
      );
    }

    const totalStudents = unassignedStudents.length;
    const numberOfSections = Math.ceil(totalStudents / capacity);

    const sectionNames = Array.from({ length: numberOfSections }, (_, i) =>
      String.fromCharCode(65 + i),
    );

    const createdSections: {
      id: string;
      name: string;
      studentCount: number;
    }[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < numberOfSections; i++) {
        const start = i * capacity;
        const end = start + capacity;
        const studentIds = unassignedStudents
          .slice(start, end)
          .map((s) => s.id);

        const newSection = await tx.section.create({
          data: {
            batchId,
            name: sectionNames[i],
            isDefault: false,
            status: 'ACTIVE',
          },
        });

        await tx.student.updateMany({
          where: { id: { in: studentIds } },
          data: { sectionId: newSection.id },
        });

        await tx.studentAcademicRecord.updateMany({
          where: {
            studentId: { in: studentIds },
            status: 'ENROLLED',
          },
          data: { sectionId: newSection.id },
        });

        createdSections.push({
          id: newSection.id,
          name: newSection.name,
          studentCount: studentIds.length,
        });
      }
    });

    return {
      message: `Automatically created ${numberOfSections} sections`,
      capacityUsed: capacity,
      totalStudents,
      sections: createdSections,
    };
  }

  // ─────────────────────────────────────────────
  // MANUAL: Assign students to named sections
  // ─────────────────────────────────────────────
  async manualAssign(batchId: string, dto: ManualAssignDto) {
    const allStudentIds = dto.sections.flatMap((s) => s.studentIds);

    if (allStudentIds.length === 0) {
      throw new BadRequestException('No students provided');
    }

    const uniqueIds = new Set(allStudentIds);
    if (uniqueIds.size !== allStudentIds.length) {
      throw new BadRequestException('A student cannot be in multiple sections');
    }

    const createdSections: {
      id: string;
      name: string;
      studentCount: number;
    }[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const sec of dto.sections) {
        const newSection = await tx.section.create({
          data: {
            batchId,
            name: sec.name.trim().toUpperCase(),
            isDefault: false,
            status: 'ACTIVE',
          },
        });

        await tx.student.updateMany({
          where: { id: { in: sec.studentIds } },
          data: { sectionId: newSection.id },
        });

        await tx.studentAcademicRecord.updateMany({
          where: {
            studentId: { in: sec.studentIds },
            status: 'ENROLLED',
          },
          data: { sectionId: newSection.id },
        });

        createdSections.push({
          id: newSection.id,
          name: newSection.name,
          studentCount: sec.studentIds.length,
        });
      }
    });

    return {
      message: 'Sections created and students assigned',
      sections: createdSections,
    };
  }

  // ─────────────────────────────────────────────
  // Reset all sections → move everyone to default
  // ─────────────────────────────────────────────
  async resetAllSections(batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const defaultSection = await this.ensureDefaultSection(batchId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Move ALL students of this batch to default section
      await tx.student.updateMany({
        where: { batchId },
        data: { sectionId: defaultSection.id },
      });

      // 2. Update current academic records as well
      await tx.studentAcademicRecord.updateMany({
        where: {
          student: { batchId },
          status: 'ENROLLED',
        },
        data: { sectionId: defaultSection.id },
      });

      // 3. Soft-delete all real sections of this batch
      await tx.section.updateMany({
        where: {
          batchId,
          isDefault: false,
        },
        data: { status: 'INACTIVE' },
      });

      return {
        message:
          'All sections removed. All students moved back to default section.',
      };
    });
  }

  // ─────────────────────────────────────────────
  // Move students between sections (bulk)
  // ─────────────────────────────────────────────
  async moveStudents(batchId: string, dto: MoveStudentsDto) {
    const targetSection = await this.prisma.section.findFirst({
      where: {
        id: dto.targetSectionId,
        batchId,
        status: 'ACTIVE',
      },
    });

    if (!targetSection) {
      throw new NotFoundException('Target section not found');
    }

    // Capacity check (only for real sections)
    if (!targetSection.isDefault) {
      const batch = await this.prisma.batch.findUnique({
        where: { id: batchId },
      });
      if (batch?.sectionCapacity) {
        const currentCount = await this.prisma.student.count({
          where: { sectionId: dto.targetSectionId },
        });

        if (currentCount + dto.studentIds.length > batch.sectionCapacity) {
          throw new BadRequestException(
            `Section ${targetSection.name} will exceed capacity of ${batch.sectionCapacity}`,
          );
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.student.updateMany({
        where: { id: { in: dto.studentIds }, batchId },
        data: { sectionId: dto.targetSectionId },
      });

      await tx.studentAcademicRecord.updateMany({
        where: {
          studentId: { in: dto.studentIds },
          status: 'ENROLLED',
        },
        data: { sectionId: dto.targetSectionId },
      });

      return {
        message: 'Students moved successfully',
        movedCount: dto.studentIds.length,
      };
    });
  }

  // ─────────────────────────────────────────────
  // DELETE a section → students go back to default
  // ─────────────────────────────────────────────
  async deleteSection(batchId: string, sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: {
        id: sectionId,
        batchId,
        isDefault: false,
      },
    });

    if (!section) {
      throw new NotFoundException(
        'Section not found or it is the default section',
      );
    }

    const defaultSection = await this.ensureDefaultSection(batchId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Move all students of this section back to default
      await tx.student.updateMany({
        where: { sectionId: section.id },
        data: { sectionId: defaultSection.id },
      });

      // 2. Also update academic records
      await tx.studentAcademicRecord.updateMany({
        where: {
          sectionId: section.id,
          status: 'ENROLLED',
        },
        data: { sectionId: defaultSection.id },
      });

      // 3. Soft delete the section
      await tx.section.update({
        where: { id: section.id },
        data: { status: 'INACTIVE' },
      });

      return {
        message: `Section ${section.name} deleted. All students moved back to default section.`,
      };
    });
  }
}
