import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { UserService } from '../../../user/user.service';
import { RoleService } from '../../../user/role/role.service';
import { CreateFacultyDto } from '../dto/create-faculty.dto';
import { UpdateFacultyDto } from '../dto/update-faculty.dto';
import { QueryFacultyDto } from '../dto/query-faculty.dto';
import { UpdateFacultyStatusDto } from '../dto/update-faculty-status.dto';
import { ROLES } from '../../../../common/constants/roles';
import type {
  FacultyDetail,
  FacultyListItem,
  PaginatedFaculty,
  TeachingLoad,
} from '../types/faculty.types';

@Injectable()
export class FacultyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly roleService: RoleService,
  ) {}

  async create(dto: CreateFacultyDto): Promise<FacultyDetail> {
    const facultyRole = await this.roleService.findByName(ROLES.FACULTY);
    const defaultPassword = process.env.DEFAULT_FACULTY_PASSWORD || 'faculty123';

    return this.prisma.$transaction(async (tx) => {
      // 1. Check for existing records
      const [existingFaculty, existingUser] = await Promise.all([
        tx.faculty.findFirst({
          where: {
            OR: [
              { employeeNumber: dto.employeeNumber },
              ...(dto.cnic ? [{ cnic: dto.cnic }] : []),
            ],
          },
        }),
        tx.user.findUnique({
          where: {
            username: dto.username || dto.employeeNumber.toLowerCase(),
          },
        }),
      ]);

      if (existingFaculty?.employeeNumber === dto.employeeNumber) {
        throw new ConflictException(
          `Faculty with employee number ${dto.employeeNumber} already exists`,
        );
      }

      if (existingFaculty?.cnic === dto.cnic) {
        throw new ConflictException(`CNIC ${dto.cnic} is already registered`);
      }

      if (existingUser) {
        throw new ConflictException(
          `Username ${dto.username || dto.employeeNumber} already exists`,
        );
      }

      // 2. Create user
      const user = await this.userService.create(
        {
          username: (dto.username || dto.employeeNumber).toLowerCase(),
          password: dto.password || defaultPassword,
          roleId: facultyRole.id,
        },
        tx,
      );

      // 3. Create faculty
      const faculty = await tx.faculty.create({
        data: {
          userId: user.id,
          employeeNumber: dto.employeeNumber.toUpperCase(),
          firstName: dto.firstName,
          middleName: dto.middleName,
          lastName: dto.lastName,
          email: dto.email,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          cnic: dto.cnic,
          phone: dto.phone,
          address: dto.address,
          city: dto.city,
          designation: dto.designation,
          qualification: dto.qualification,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        },
      });

      return this.findOne(faculty.id);
    });
  }

  async findAll(query: QueryFacultyDto): Promise<PaginatedFaculty> {
    const { page = 1, limit = 20, search, status, designation } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (designation) {
      where.designation = designation;
    }

    if (search) {
      where.OR = [
        { employeeNumber: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cnic: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.faculty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          middleName: true,
          lastName: true,
          email: true,
          phone: true,
          designation: true,
          qualification: true,
          joiningDate: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.faculty.count({ where }),
    ]);

    return {
      data: data as FacultyListItem[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<FacultyDetail> {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!faculty) {
      throw new NotFoundException(`Faculty with ID ${id} not found`);
    }

    return faculty as FacultyDetail;
  }

  async update(id: string, dto: UpdateFacultyDto): Promise<FacultyDetail> {
    const faculty = await this.findOne(id);

    // Check CNIC uniqueness if updating
    if (dto.cnic && dto.cnic !== faculty.cnic) {
      const existingCnic = await this.prisma.faculty.findUnique({
        where: { cnic: dto.cnic },
      });
      if (existingCnic) {
        throw new ConflictException(`CNIC ${dto.cnic} is already registered`);
      }
    }

    await this.prisma.faculty.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        email: dto.email,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        cnic: dto.cnic,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        designation: dto.designation,
        qualification: dto.qualification,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
      },
    });

    return this.findOne(id);
  }

  async updateStatus(
    id: string,
    dto: UpdateFacultyStatusDto,
  ): Promise<FacultyDetail> {
    await this.findOne(id);

    await this.prisma.faculty.update({
      where: { id },
      data: { status: dto.status },
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string; id: string }> {
    await this.findOne(id);

    // Check if faculty has any active allocations
    const allocations = await this.prisma.courseAllocation.count({
      where: { facultyId: id, status: 'active' },
    });

    if (allocations > 0) {
      throw new BadRequestException(
        `Cannot delete faculty with active course allocations. Please remove allocations first or set status to inactive.`,
      );
    }

    // Soft delete by setting status to inactive
    await this.prisma.faculty.update({
      where: { id },
      data: { status: 'inactive' },
    });

    return {
      message: 'Faculty deactivated successfully',
      id,
    };
  }

  async getTeachingLoad(
    id: string,
    academicSessionId?: string,
  ): Promise<TeachingLoad> {
    await this.findOne(id);

    const where: any = {
      facultyId: id,
      status: 'active',
    };

    if (academicSessionId) {
      where.academicSessionId = academicSessionId;
    }

    const allocations = await this.prisma.courseAllocation.findMany({
      where,
      include: {
        course: true,
        section: {
          include: {
            batch: true,
          },
        },
        academicSession: true,
      },
    });

    const totalCreditHours = allocations.reduce(
      (sum, alloc) => sum + (alloc.course.creditHours || 0),
      0,
    );

    return {
      allocations,
      totalCourses: allocations.length,
      totalCreditHours,
    };
  }
}
