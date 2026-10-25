import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import {
  CreateSectionDto,
  UpdateSectionDto,
  MoveStudentsSectionDto,
} from '../dto/section.dto';

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SectionService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // Create a new section for a batch
  // ─────────────────────────────────────────────
  async createSection(dto: CreateSectionDto, batchId: string) {
    let name: string;

    if (dto.name?.trim()) {
      name = dto.name.trim().toUpperCase();
    } else {
      const existingSections = await this.prisma.section.findMany({
        where: { batchId },
        select: { name: true },
      });
      const existingNames = new Set(
        existingSections.map((s) => s.name.toUpperCase()),
      );

      let nextCharCode = 65; // 'A'
      while (existingNames.has(String.fromCharCode(nextCharCode))) {
        nextCharCode++;
        if (nextCharCode > 90) {
          throw new BadRequestException(
            'All section letters (A-Z) are already used in this batch.',
          );
        }
      }
      name = String.fromCharCode(nextCharCode);
    }

    return this.createSectionWithName(batchId, name);
  }

  // ─────────────────────────────────────────────
  // List real sections of a batch
  // ─────────────────────────────────────────────
  async listSections(batchId: string) {
    const sections = await this.prisma.section.findMany({
      where: {
        batchId,
      },
      orderBy: { name: 'asc' },
    });

    return sections.map((s) => ({
      id: s.id,
      name: s.name,
    }));
  }

  // ─────────────────────────────────────────────
  // Update a section for a batch
  // ─────────────────────────────────────────────
  async updateSection(batchId: string, id: string, dto: UpdateSectionDto) {
    const section = await this.findSectionOrThrow(batchId, id);

    const data: Prisma.SectionUpdateInput = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim().toUpperCase();

      // Empty name allow nahi
      if (!name) {
        throw new BadRequestException('Section name cannot be empty');
      }

      if (name !== section.name) {
        data.name = name;
      }
    }

    // Kuch change nahi to DB call skip
    if (Object.keys(data).length === 0) {
      return section;
    }

    try {
      return await this.prisma.section.update({
        where: { id },
        data,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `Section '${data.name as string}' already exists in this batch.`,
        );
      }
      throw e;
    }
  }

  // ─────────────────────────────────────────────
  // Move students to a section
  // ─────────────────────────────────────────────
  async moveStudents(batchId: string, dto: MoveStudentsSectionDto) {
    if (!dto.studentIds || dto.studentIds.length === 0) {
      throw new BadRequestException('At least one student is required');
    }

    if (dto.targetSectionId === null) {
      throw new BadRequestException('Target section ID cannot be null');
    }

    // Target section isi batch ka hona chahiye
    const targetSection = await this.findSectionOrThrow(
      batchId,
      dto.targetSectionId,
    );

    // Verify aur update ka filter bilkul same rakhna hai
    const where = {
      studentId: { in: dto.studentIds },
      batchId,
      status: 'ENROLLED' as const,
    };

    const enrolledCount = await this.prisma.studentAcademicRecord.count({
      where,
    });

    if (enrolledCount !== dto.studentIds.length) {
      throw new BadRequestException(
        'One or more students are not enrolled in this batch',
      );
    }

    const result = await this.prisma.studentAcademicRecord.updateMany({
      where,
      data: { sectionId: targetSection.id },
    });

    return {
      message: 'Students moved successfully',
      movedCount: result.count,
      targetSection: {
        id: targetSection.id,
        name: targetSection.name,
      },
    };
  }

  // ─────────────────────────────────────────────
  // DELETE a section → students go back to default
  // ─────────────────────────────────────────────
  async deleteSection(batchId: string, sectionId: string) {
    const section = await this.findSectionOrThrow(batchId, sectionId);

    const totalSections = await this.prisma.section.count({
      where: { batchId },
    });

    if (totalSections <= 1) {
      throw new BadRequestException(
        'Cannot delete the only section of the batch.',
      );
    }

    const recordsCount = await this.prisma.studentAcademicRecord.count({
      where: { sectionId: section.id },
    });

    if (recordsCount > 0) {
      throw new ConflictException(
        `Cannot delete section '${section.name}'. It has ${recordsCount} student record(s) assigned.`,
      );
    }

    try {
      await this.prisma.section.delete({ where: { id: section.id } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new ConflictException(
          `Cannot delete section '${section.name}'. It is still in use (for example by course allocations).`,
        );
      }
      throw e;
    }

    return {
      message: `Section '${section.name}' deleted successfully.`,
    };
  }

  // ─────────────────────────────────────────────
  // Suggest / assign section for a student
  // ─────────────────────────────────────────────
  async suggestSection(
    batchId: string,
    sectionId?: string | null,
    client: Db = this.prisma,
  ): Promise<{
    id: string;
    name: string;
    studentCount?: number;
    reason: string;
  }> {
    // 1. Explicit sectionId given → just validate & return
    if (sectionId) {
      const section = await this.findSectionOrThrow(batchId, sectionId);
      return {
        id: section.id,
        name: section.name,
        reason: 'explicitly_provided',
      };
    }

    // 2. Load existing sections
    const sections = await client.section.findMany({
      where: { batchId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // 3. No sections at all → create default "A"
    if (sections.length === 0) {
      const created = await this.createSectionWithName(batchId, 'A', client);
      return {
        id: created.id,
        name: created.name,
        studentCount: 0,
        reason: 'created_default_A',
      };
    }

    // 4. Count enrolled students for each section
    const counts = await Promise.all(
      sections.map(async (s) => {
        const studentCount = await client.studentAcademicRecord.count({
          where: {
            sectionId: s.id,
            batchId,
            status: 'ENROLLED',
          },
        });
        return { ...s, studentCount };
      }),
    );

    // 5. Pick the one with the fewest students (ties → first by name)
    const chosen = counts.reduce((best, curr) =>
      curr.studentCount < best.studentCount ? curr : best,
    );

    return {
      id: chosen.id,
      name: chosen.name,
      studentCount: chosen.studentCount,
      reason: 'least_students',
    };
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private async findSectionOrThrow(
    batchId: string,
    id: string,
    client: Db = this.prisma,
  ) {
    const section = await client.section.findFirst({
      where: { id, batchId },
    });

    if (!section) {
      throw new NotFoundException(
        `Section '${id}' not found in batch '${batchId}'.`,
      );
    }

    return section;
  }

  private async createSectionWithName(
    batchId: string,
    name: string,
    client: Db = this.prisma,
  ) {
    // Batch must exist
    const batch = await client.batch.findUnique({
      where: { id: batchId },
      select: { id: true },
    });
    if (!batch) throw new NotFoundException('Batch not found');

    const normalized = name.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Section name cannot be empty');
    }

    // Duplicate check
    const duplicate = await client.section.findFirst({
      where: { batchId, name: normalized },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException(
        `Section '${normalized}' already exists in this batch.`,
      );
    }

    return client.section.create({
      data: { batchId, name: normalized },
    });
  }
}
