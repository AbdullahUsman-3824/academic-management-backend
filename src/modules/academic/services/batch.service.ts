// batch.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateBatchDto } from '../dto/create-batch.dto';
import { UpdateBatchDto } from '../dto/update-batch.dto';
import { BatchStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { MappedBatchResponse } from '../types/academic.types';

type TxClient = Prisma.TransactionClient;

const DEFAULT_PROGRAM_DURATION = process.env.DEFAULT_PROGRAM_DURATION
  ? parseInt(process.env.DEFAULT_PROGRAM_DURATION, 10)
  : 4;

const DEFAULT_SECTION_CAPACITY = process.env.DEFAULT_SECTION_CAPACITY
  ? parseInt(process.env.DEFAULT_SECTION_CAPACITY, 10)
  : 100;

const BATCH_WITH_RELATIONS = {
  entryYear: true,
  _count: {
    select: { students: true, sections: true },
  },
} as const;

type BatchWithRelations = Prisma.BatchGetPayload<{
  include: {
    entryYear: true;
    _count: { select: { students: true; sections: true } };
  };
}>;

@Injectable()
export class BatchService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBatchDto: CreateBatchDto, tx?: TxClient) {
    const { name, entryYearId, programDuration, sectionCapacity, status } =
      createBatchDto;

    const client = tx ?? this.prisma;

    // Ensure the referenced AcademicYear exists
    const entryYear = await client.academicYear.findUnique({
      where: { id: entryYearId },
    });
    if (!entryYear) {
      throw new NotFoundException(
        `AcademicYear with ID "${entryYearId}" not found`,
      );
    }

    try {
      return await client.batch.create({
        data: {
          name,
          entryYearId,
          programDuration: programDuration ?? DEFAULT_PROGRAM_DURATION,
          sectionCapacity: sectionCapacity ?? DEFAULT_SECTION_CAPACITY,
          status: status ?? BatchStatus.ACTIVE,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(`Batch "${name}" already exists`);
      }
      throw err;
    }
  }

  async findAll(status?: BatchStatus): Promise<MappedBatchResponse[]> {
    if (status && !Object.values(BatchStatus).includes(status)) {
      throw new BadRequestException(
        `Invalid status "${status}". Allowed values: ${Object.values(BatchStatus).join(', ')}`,
      );
    }

    const batches = await this.prisma.batch.findMany({
      where: {
        ...(status && { status }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: BATCH_WITH_RELATIONS,
    });

    return batches.map((batch) => this.toBatchResponse(batch));
  }

  async findOne(id: string): Promise<MappedBatchResponse> {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: BATCH_WITH_RELATIONS,
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID "${id}" not found`);
    }

    return this.toBatchResponse(batch);
  }

  /**
   * Maps a Batch (with entryYear) → MappedBatchResponse
   * startDate = entryYear.startDate
   * endDate   = entryYear.startDate + programDuration years
   */
  private toBatchResponse(batch: BatchWithRelations): MappedBatchResponse {
    const startDate = batch.entryYear.startDate;

    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + batch.programDuration);

    return {
      id: batch.id,
      name: batch.name,
      entryYearId: batch.entryYearId,
      startDate,
      endDate,
      status: batch.status,
      counts: batch._count,
    };
  }

  async update(id: string, dto: UpdateBatchDto): Promise<MappedBatchResponse> {
    await this.findOne(id);

    // Name uniqueness check
    if (dto.name) {
      const existing = await this.prisma.batch.findUnique({
        where: { name: dto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Batch "${dto.name}" already exists`);
      }
    }

    // Validate entryYearId if provided
    if (dto.entryYearId) {
      const entryYear = await this.prisma.academicYear.findUnique({
        where: { id: dto.entryYearId },
      });
      if (!entryYear) {
        throw new NotFoundException(
          `AcademicYear with ID "${dto.entryYearId}" not found`,
        );
      }
    }

    const data: Prisma.BatchUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.entryYearId !== undefined && {
        entryYear: { connect: { id: dto.entryYearId } },
      }),
      ...(dto.programDuration !== undefined && {
        programDuration: dto.programDuration,
      }),
      ...(dto.sectionCapacity !== undefined && {
        sectionCapacity: dto.sectionCapacity,
      }),
      ...(dto.status !== undefined && { status: dto.status }),
    };

    const updated = await this.prisma.batch.update({
      where: { id },
      data,
      include: BATCH_WITH_RELATIONS,
    });

    return this.toBatchResponse(updated);
  }

  async activate(id: string): Promise<MappedBatchResponse> {
    const batch = await this.findOne(id);

    if (batch.status === BatchStatus.ACTIVE) {
      throw new BadRequestException('Batch is already active');
    }

    if (
      batch.status === BatchStatus.COMPLETED ||
      batch.status === BatchStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot activate a batch with status "${batch.status}"`,
      );
    }

    const activated = await this.prisma.batch.update({
      where: { id },
      data: {
        status: BatchStatus.ACTIVE,
      },
      include: BATCH_WITH_RELATIONS,
    });

    return this.toBatchResponse(activated);
  }
}
