import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { UpdateStudentStatusDto } from '../dto/update-student-status.dto';
import { QueryStudentsDto } from '../dto/query-students.dto';
import { StudentStatus } from '../enums/student-status.enum';
import type {
  StudentDetail,
  StudentListItem,
  PaginatedStudents,
  BulkEnrollResult,
} from '../types/student.types';
import * as argon2 from 'argon2';
import { Prisma } from '@/generated/prisma/client';

// Adjust path / name to match your config (env or SystemSettings table)
const DEFAULT_STUDENT_PASSWORD =
  process.env.DEFAULT_STUDENT_PASSWORD ?? 'Student@123';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Enroll one student ────────────────────────────────────────────────────

  async create(dto: CreateStudentDto): Promise<StudentDetail> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const existingReg = await this.prisma.student.findUnique({
      where: { stdRegNumber: dto.stdRegNumber },
    });
    if (existingReg) {
      throw new ConflictException('Student registration number already exists');
    }

    if (dto.cnic) {
      const existingCnic = await this.prisma.student.findUnique({
        where: { cnic: dto.cnic },
      });
      if (existingCnic) {
        throw new ConflictException('CNIC already exists');
      }
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { username: dto.stdRegNumber },
    });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const studentRole = await this.prisma.role.findFirst({
      where: { name: 'student' },
    });
    if (!studentRole) {
      throw new BadRequestException(
        'Student role not found. Seed roles before enrolling students.',
      );
    }

  const passwordHash = await argon2.hash(DEFAULT_STUDENT_PASSWORD);
    const admissionDate = dto.admissionDate
      ? new Date(dto.admissionDate)
      : new Date();

    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.stdRegNumber,
          passwordHash,
          roleId: studentRole.id,
        },
      });

      return tx.student.create({
        data: {
          userId: user.id,
          batchId: dto.batchId,
          stdRegNumber: dto.stdRegNumber,
          firstName: dto.firstName,
          middleName: dto.middleName,
          lastName: dto.lastName,
          email: dto.email,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          cnic: dto.cnic,
          profileImageUrl: dto.profileImageUrl,
          phone: dto.phone,
          address: dto.address,
          city: dto.city,
          guardianName: dto.guardianName,
          guardianRelation: dto.guardianRelation,
          guardianPhone: dto.guardianPhone,
          guardianCnic: dto.guardianCnic,
          admissionDate,
          status: StudentStatus.ACTIVE,
        },
        include: {
          batch: { select: { id: true, name: true } },
          user: { select: { id: true, username: true } },
        },
      });
    });

    return this.toDetail(student);
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async findAll(query: QueryStudentsDto): Promise<PaginatedStudents> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.batchId && { batchId: query.batchId }),
      ...(query.search && {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { middleName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { stdRegNumber: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search, mode: 'insensitive' } },
          {
            user: {
              username: { contains: query.search, mode: 'insensitive' },
            },
          },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          batch: { select: { id: true, name: true } },
          user: { select: { id: true, username: true } },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data: rows.map((s) => this.toListItem(s)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // ── Detail ────────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<StudentDetail> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        batch: { select: { id: true, name: true } },
        user: { select: { id: true, username: true } },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.toDetail(student);
  }

  // ── Update profile ────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateStudentDto): Promise<StudentDetail> {
    await this.findOne(id);

    if (dto.batchId) {
      const batch = await this.prisma.batch.findUnique({
        where: { id: dto.batchId },
      });
      if (!batch) throw new NotFoundException('Batch not found');
    }

    if (dto.cnic) {
      const existing = await this.prisma.student.findFirst({
        where: { cnic: dto.cnic, id: { not: id } },
      });
      if (existing) throw new ConflictException('CNIC already exists');
    }

    const student = await this.prisma.student.update({
      where: { id },
      data: {
        ...(dto.batchId !== undefined && { batchId: dto.batchId }),
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.middleName !== undefined && { middleName: dto.middleName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.dateOfBirth !== undefined && {
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.cnic !== undefined && { cnic: dto.cnic }),
        ...(dto.profileImageUrl !== undefined && {
          profileImageUrl: dto.profileImageUrl,
        }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.guardianName !== undefined && {
          guardianName: dto.guardianName,
        }),
        ...(dto.guardianRelation !== undefined && {
          guardianRelation: dto.guardianRelation,
        }),
        ...(dto.guardianPhone !== undefined && {
          guardianPhone: dto.guardianPhone,
        }),
        ...(dto.guardianCnic !== undefined && {
          guardianCnic: dto.guardianCnic,
        }),
        ...(dto.admissionDate !== undefined && {
          admissionDate: new Date(dto.admissionDate),
        }),
      },
      include: {
        batch: { select: { id: true, name: true } },
        user: { select: { id: true, username: true } },
      },
    });

    return this.toDetail(student);
  }

  // ── Status only ───────────────────────────────────────────────────────────

  async updateStatus(id: string, dto: UpdateStudentStatusDto) {
    await this.findOne(id);

    const student = await this.prisma.student.update({
      where: { id },
      data: { status: dto.status },
      select: { id: true, status: true, updatedAt: true },
    });

    return student;
  }

  // ── Mappers (never expose password) ───────────────────────────────────────

  private toListItem(s: any): StudentListItem {
    return {
      id: s.id,
      userId: s.userId ?? s.user?.id,
      username: s.user?.username ?? s.stdRegNumber,
      stdRegNumber: s.stdRegNumber,
      firstName: s.firstName,
      middleName: s.middleName,
      lastName: s.lastName,
      email: s.email,
      phone: s.phone,
      gender: s.gender,
      batch: s.batch ? { id: s.batch.id, name: s.batch.name } : null,
      status: s.status,
      admissionDate: s.admissionDate,
    };
  }

  private toDetail(s: any): StudentDetail {
    return {
      ...this.toListItem(s),
      dateOfBirth: s.dateOfBirth,
      cnic: s.cnic,
      profileImageUrl: s.profileImageUrl,
      address: s.address,
      city: s.city,
      guardianName: s.guardianName,
      guardianRelation: s.guardianRelation,
      guardianPhone: s.guardianPhone,
      guardianCnic: s.guardianCnic,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}