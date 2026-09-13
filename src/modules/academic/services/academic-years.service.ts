import { PrismaService } from '../../../database/prisma.service';
import { ConflictException } from '@nestjs/common/exceptions/conflict.exception';
import { CreateAcademicYearDto } from '../dto/create-academic-year.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateAcademicYearDto } from '../dto/update-academic-year.dto';
import { AcademicYearResponse } from '../types/academic.types';
import { AcademicYearStatus } from '../enums/academic-status.enum';
import { Prisma } from '../../../generated/prisma/client';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class AcademicYearsService {
  constructor(private prisma: PrismaService) {}

  async create(
    data: CreateAcademicYearDto,
    tx?: TxClient,
  ): Promise<AcademicYearResponse> {
    const run = async (client: TxClient | PrismaService) => {
      try {
        await client.academicYear.updateMany({
          where: { status: 'active' },
          data: { status: 'completed' },
        });

        return await client.academicYear.create({
          data: {
            name: data.name,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            status: 'active',
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new ConflictException(
            `Academic Year "${data.name}" already exists`,
          );
        }
        throw err;
      }
    };

    // If we're already inside an outer transaction (setup flow), reuse it —
    // don't nest another $transaction. Otherwise wrap standalone calls atomically.
    const academicYear = tx
      ? await run(tx)
      : await this.prisma.$transaction((trx) => run(trx));

    return {
      ...academicYear,
      status: academicYear.status as AcademicYearStatus,
    };
  }

  async findAll(status?: AcademicYearStatus) {
    return this.prisma.academicYear.findMany({
      where: {
        ...(status && { status }),
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
      include: {
        academicSessions: {
          orderBy: {
            startDate: 'asc',
          },
        },
      },
    });

    if (!year) {
      throw new NotFoundException(`Academic Year with ID "${id}" not found`);
    }

    return year;
  }

  async update(id: string, dto: UpdateAcademicYearDto) {
    await this.findOne(id);

    const data: Prisma.AcademicYearUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.startDate !== undefined && {
        startDate: new Date(dto.startDate),
      }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
    };

    return this.prisma.academicYear.update({
      where: { id },
      data,
      include: {
        academicSessions: {
          orderBy: { startDate: 'asc' },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.academicYear.delete({
      where: { id },
    });
  }
}
