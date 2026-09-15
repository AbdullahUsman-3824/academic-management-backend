import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { UserService } from '@/modules/user/user.service';
import { RoleService } from '@/modules/user/role/role.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { UpdateStudentStatusDto } from '../dto/update-student-status.dto';
import { QueryStudentsDto } from '../dto/query-students.dto';
import { StudentStatus } from '../enums/student-status.enum';
import { ROLES } from '../../../../common/constants/roles';
import type {
  StudentDetail,
  StudentListItem,
  PaginatedStudents,
} from '../types/student.types';
import { Prisma } from '@/generated/prisma/client';
import type { CellValue } from 'exceljs';

type StudentWithRelations = Prisma.StudentGetPayload<{
  include: {
    batch: { select: { id: true; name: true } };
    user: { select: { id: true; username: true } };
  };
}>;

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly roleService: RoleService,
  ) {}

  // ── Enroll one student ────────────────────────────────────────────────────

  async create(dto: CreateStudentDto): Promise<StudentDetail> {
    const studentRole = await this.roleService.findByName(ROLES.STUDENT);
    const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD;
    if (!defaultPassword) {
      throw new Error('DEFAULT_STUDENT_PASSWORD must be configured');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Existence checks inside the transaction
      const [batch, existingStudent, existingUser] = await Promise.all([
        tx.batch.findUnique({ where: { id: dto.batchId } }),
        tx.student.findFirst({
          where: {
            OR: [
              { stdRegNumber: dto.stdRegNumber },
              ...(dto.cnic ? [{ cnic: dto.cnic }] : []),
            ],
          },
        }),
        tx.user.findUnique({ where: { username: dto.stdRegNumber } }),
      ]);
      if (!batch) throw new NotFoundException('Batch not found');
      if (existingStudent?.stdRegNumber === dto.stdRegNumber)
        throw new ConflictException(
          'Student registration number already exists',
        );
      if (existingStudent?.cnic === dto.cnic)
        throw new ConflictException('CNIC already exists');
      if (existingUser) throw new ConflictException('Username already exists');

      // 2. Create user
      const user = await this.userService.create(
        {
          username: dto.stdRegNumber,
          password: defaultPassword,
          roleId: studentRole.id,
        },
        tx,
      );

      // 3. Create student
      const student = await tx.student.create({
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
          admissionDate: dto.admissionDate
            ? new Date(dto.admissionDate)
            : new Date(),
          status: StudentStatus.ACTIVE,
        },
        include: {
          batch: { select: { id: true, name: true } },
          user: { select: { id: true, username: true } },
        },
      });
      return this.toDetail(student);
    });
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async findAll(query: QueryStudentsDto): Promise<PaginatedStudents> {
    const page = query.page ?? 1;
    const limit = Math.min(Math.max(1, query.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    const where: Prisma.StudentWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.batchId && { batchId: query.batchId }),
      ...(search &&
        search.length >= 2 && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { middleName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { stdRegNumber: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            {
              user: {
                username: { contains: search, mode: 'insensitive' },
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
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.student.findUnique({
        where: { id },
        select: { id: true, cnic: true },
      });
      if (!existing) throw new NotFoundException('Student not found');

      if (dto.batchId) {
        const batch = await tx.batch.findUnique({ where: { id: dto.batchId } });
        if (!batch) throw new NotFoundException('Batch not found');
      }

      if (dto.cnic && dto.cnic !== existing.cnic) {
        const conflict = await tx.student.findFirst({
          where: { cnic: dto.cnic, id: { not: id } },
          select: { id: true },
        });
        if (conflict) throw new ConflictException('CNIC already exists');
      }
      const student = await tx.student.update({
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
    });
  }

  // ── Status only ───────────────────────────────────────────────────────────

  async updateStatus(id: string, dto: UpdateStudentStatusDto) {
    await this.ensureExists(id);

    const student = await this.prisma.student.update({
      where: { id },
      data: { status: dto.status },
      select: { id: true, status: true, updatedAt: true },
    });

    return student;
  }

  // ── Bulk Enrollment ─────────────────────────────────────────────────────────

  async bulkCreate(
    file: {
      buffer: Buffer;
      size: number;
      mimetype: string;
      originalname: string;
    },
    dryRun = false,
  ): Promise<{
    totalRows: number;
    successCount: number;
    failedCount: number;
    errors: Array<{
      row: number;
      stdRegNumber: string | null;
      errors: string[];
    }>;
  }> {
    if (!file?.buffer) {
      throw new BadRequestException('File is required');
    }

    const isXlsx =
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.toLowerCase().endsWith('.xlsx');

    if (!isXlsx) {
      throw new BadRequestException('Only .xlsx files are supported');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 5 MB');
    }

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();

    // Force a plain Buffer and silence the type mismatch
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await workbook.xlsx.load(Buffer.from(file.buffer) as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Excel file is empty');
    }

    // Header mapping
    const headers: Record<string, number> = {};
    const headerRow = worksheet.getRow(1);

    headerRow.eachCell((cell, colNumber) => {
      const key = cellToString(cell.value)?.toLowerCase() ?? '';
      if (key) headers[key] = colNumber;
    });

    const requiredHeaders = ['stdregnumber', 'firstname'];
    for (const h of requiredHeaders) {
      if (!headers[h]) {
        throw new BadRequestException(`Missing required column: ${h}`);
      }
    }

    // Pre-load once
    const studentRole = await this.roleService.findByName(ROLES.STUDENT);
    const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD;
    if (!defaultPassword) {
      throw new Error('DEFAULT_STUDENT_PASSWORD must be configured');
    }

    const allBatches = await this.prisma.batch.findMany({
      select: { id: true, name: true },
    });
    const batchByName = new Map(
      allBatches.map((b) => [b.name.toLowerCase().trim(), b.id]),
    );
    const batchById = new Set(allBatches.map((b) => b.id));

    const errors: Array<{
      row: number;
      stdRegNumber: string | null;
      errors: string[];
    }> = [];
    let successCount = 0;
    let totalRows = 0;

    // Safe extractor – no `any`, no unsafe member access
    function cellToString(val: CellValue): string | null {
      if (val === null || val === undefined) return null;

      if (
        typeof val === 'string' ||
        typeof val === 'number' ||
        typeof val === 'boolean'
      ) {
        const str = String(val).trim();
        return str || null;
      }

      if (typeof val === 'object') {
        // Rich text
        if ('text' in val && typeof val.text === 'string') {
          const str = val.text.trim();
          return str || null;
        }
        // Formula result
        if ('result' in val) {
          const result = val.result;
          if (
            typeof result === 'string' ||
            typeof result === 'number' ||
            typeof result === 'boolean'
          ) {
            const str = String(result).trim();
            return str || null;
          }
        }
        // Date
        if (val instanceof Date) {
          return val.toISOString();
        }
      }

      return null;
    }

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      // Safe empty check
      const values = Array.isArray(row.values) ? row.values : [];
      const isEmpty = values.every((v) => {
        if (v === null || v === undefined) return true;
        if (typeof v === 'object') return false; // formula / rich text etc.
        return String(v).trim() === '';
      });
      if (isEmpty) continue;

      totalRows++;

      const getValue = (header: string): string | null => {
        const col = headers[header];
        if (!col) return null;
        return cellToString(row.getCell(col).value);
      };

      const stdRegNumber = getValue('stdregnumber');
      const firstName = getValue('firstname');
      const batchName = getValue('batchname');
      const batchIdRaw = getValue('batchid');
      const middleName = getValue('middlename');
      const lastName = getValue('lastname');
      const email = getValue('email');
      const dateOfBirth = getValue('dateofbirth');
      const gender = getValue('gender');
      const cnic = getValue('cnic');
      const phone = getValue('phone');
      const address = getValue('address');
      const city = getValue('city');
      const guardianName = getValue('guardianname');
      const guardianRelation = getValue('guardianrelation');
      const guardianPhone = getValue('guardianphone');
      const guardianCnic = getValue('guardiancnic');
      const admissionDate = getValue('admissiondate');

      const rowErrors: string[] = [];

      if (!stdRegNumber) rowErrors.push('stdRegNumber is required');
      if (!firstName) rowErrors.push('firstName is required');

      let batchId: string | null = null;

      if (batchIdRaw) {
        if (!batchById.has(batchIdRaw)) {
          rowErrors.push('Batch not found');
        } else {
          batchId = batchIdRaw;
        }
      } else if (batchName) {
        const found = batchByName.get(batchName.toLowerCase());
        if (!found) {
          rowErrors.push('Batch not found');
        } else {
          batchId = found;
        }
      } else {
        rowErrors.push('Either batchName or batchId is required');
      }

      if (
        gender &&
        !['male', 'female', 'other'].includes(gender.toLowerCase())
      ) {
        rowErrors.push('Invalid gender value');
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNumber, stdRegNumber, errors: rowErrors });
        continue;
      }

      // Dry-run
      if (dryRun) {
        const existing = await this.prisma.student.findFirst({
          where: {
            OR: [{ stdRegNumber: stdRegNumber! }, ...(cnic ? [{ cnic }] : [])],
          },
        });

        if (existing?.stdRegNumber === stdRegNumber) {
          errors.push({
            row: rowNumber,
            stdRegNumber,
            errors: ['Student registration number already exists'],
          });
        } else if (cnic && existing?.cnic === cnic) {
          errors.push({
            row: rowNumber,
            stdRegNumber,
            errors: ['CNIC already exists'],
          });
        } else {
          successCount++;
        }
        continue;
      }

      // Real create
      try {
        await this.prisma.$transaction(async (tx) => {
          const [existingStudent, existingUser] = await Promise.all([
            tx.student.findFirst({
              where: {
                OR: [
                  { stdRegNumber: stdRegNumber! },
                  ...(cnic ? [{ cnic }] : []),
                ],
              },
            }),
            tx.user.findUnique({ where: { username: stdRegNumber! } }),
          ]);

          if (existingStudent?.stdRegNumber === stdRegNumber) {
            throw new ConflictException(
              'Student registration number already exists',
            );
          }
          if (cnic && existingStudent?.cnic === cnic) {
            throw new ConflictException('CNIC already exists');
          }
          if (existingUser) {
            throw new ConflictException('Username already exists');
          }

          const user = await this.userService.create(
            {
              username: stdRegNumber!,
              password: defaultPassword,
              roleId: studentRole.id,
            },
            tx,
          );

          await tx.student.create({
            data: {
              userId: user.id,
              batchId: batchId!,
              stdRegNumber: stdRegNumber!,
              firstName: firstName!,
              middleName: middleName ?? undefined,
              lastName: lastName ?? undefined,
              email: email ?? undefined,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
              gender: gender
                ? (gender.toLowerCase() as 'male' | 'female' | 'other')
                : undefined,
              cnic: cnic ?? undefined,
              phone: phone ?? undefined,
              address: address ?? undefined,
              city: city ?? undefined,
              guardianName: guardianName ?? undefined,
              guardianRelation: guardianRelation ?? undefined,
              guardianPhone: guardianPhone ?? undefined,
              guardianCnic: guardianCnic ?? undefined,
              admissionDate: admissionDate
                ? new Date(admissionDate)
                : new Date(),
              status: StudentStatus.ACTIVE,
            },
          });
        });

        successCount++;
      } catch (err: unknown) {
        const message =
          err instanceof ConflictException || err instanceof NotFoundException
            ? err.message
            : 'Unexpected error while creating student';

        errors.push({
          row: rowNumber,
          stdRegNumber,
          errors: [message],
        });
      }
    }

    return {
      totalRows,
      successCount,
      failedCount: errors.length,
      errors,
    };
  }

  // ── Download Template ───────────────────────────────────────────────────────

  async getBulkTemplate(): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');

    // Headers (exact names from target doc)
    const headers = [
      'stdRegNumber',
      'firstName',
      'batchName',
      'batchId',
      'middleName',
      'lastName',
      'email',
      'dateOfBirth',
      'gender',
      'cnic',
      'phone',
      'address',
      'city',
      'guardianName',
      'guardianRelation',
      'guardianPhone',
      'guardianCnic',
      'admissionDate',
    ];

    sheet.addRow(headers);

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    // Example rows
    sheet.addRow([
      'SP26-CS-001',
      'Ali',
      'SP26',
      '',
      'Ahmed',
      'Khan',
      'ali.khan@example.com',
      '2007-04-15',
      'male',
      '35202-1234567-1',
      '03001234567',
      'House 12, Street 5',
      'Lahore',
      'Muhammad Khan',
      'Father',
      '03009876543',
      '35202-7654321-9',
      '2026-09-12',
    ]);

    sheet.addRow([
      'SP26-CS-002',
      'Sara',
      'SP26',
      '',
      '',
      'Ahmed',
      'sara.ahmed@example.com',
      '2008-01-20',
      'female',
      '',
      '03009876543',
      '',
      'Karachi',
      '',
      '',
      '',
      '',
      '',
    ]);

    // Auto-width
    sheet.columns.forEach((col) => {
      col.width = 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ── Private Helpers ───────────────────────────────────────

  private toListItem(s: StudentWithRelations): StudentListItem {
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
      admissionDate: s.admissionDate ?? new Date(),
    };
  }

  private toDetail(s: StudentWithRelations): StudentDetail {
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

  private async ensureExists(id: string) {
    const exists = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Student not found');
  }
}
