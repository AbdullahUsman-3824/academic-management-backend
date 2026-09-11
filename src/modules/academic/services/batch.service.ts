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
import { BatchStatus } from '../enums/academic-status.enum';
import { BatchResponse } from '../types/academic.types';

import { Prisma } from '@/generated/prisma/client';

type TxClient = Prisma.TransactionClient;
type BatchRecord = Prisma.BatchGetPayload<Record<string, never>>;

// import { UpdateBatchDto } from '../dto/update-batch.dto';
// import { BatchResponseDto } from '../dto/batch-response.dto';

@Injectable()
export class BatchService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createBatchDto: CreateBatchDto,
    tx?: TxClient,
  ): Promise<BatchResponse> {
    const { name, startDate, endDate, status } = createBatchDto;
    const client = tx ?? this.prisma;

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : undefined;

    if (end && end <= start) {
      throw new BadRequestException('End date must be after start date');
    }

    let batch: BatchRecord;
    try {
      batch = await client.batch.create({
        data: {
          name,
          startDate: start,
          endDate: end,
          status: status ?? 'active',
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

    return {
      id: batch.id,
      name: batch.name,
      startDate: batch.startDate,
      endDate: batch.endDate ?? undefined,
      status: batch.status as BatchStatus,
    };
  }

  async findAll(status?: BatchStatus) {
    return this.prisma.batch.findMany({
      where: {
        ...(status && { status }),
      },
      orderBy: {
        startDate: 'desc',
      },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID "${id}" not found`);
    }

    return batch;
  }

  async update(id: string, dto: UpdateBatchDto) {
    await this.findOne(id);

    // Check name uniqueness
    if (dto.name) {
      const existing = await this.prisma.batch.findUnique({
        where: { name: dto.name },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(`Batch "${dto.name}" already exists`);
      }
    }

    // Validate dates
    if (dto.startDate && dto.endDate) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);

      if (end <= start) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const data: Prisma.BatchUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.startDate !== undefined && {
        startDate: new Date(dto.startDate),
      }),
      ...(dto.endDate !== undefined && {
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      }),
      ...(dto.status !== undefined && { status: dto.status }),
    };

    return this.prisma.batch.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { students: true },
        },
      },
    });
  }

  async activate(id: string) {
    const batch = await this.findOne(id);

    if (batch.status === 'active') {
      throw new BadRequestException('Batch is already active');
    }

    if (batch.status === 'completed' || batch.status === 'cancelled') {
      throw new BadRequestException(
        `Cannot activate a batch with status "${batch.status}"`,
      );
    }

    return this.prisma.batch.update({
      where: { id },
      data: {
        status: 'active',
      },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });
  }
}
