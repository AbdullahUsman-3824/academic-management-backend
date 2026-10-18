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
    console.log('[FacultyService.create] Incoming DTO:', {
      employeeNumber: dto.employeeNumber,
      firstName: dto.firstName,
      lastName: dto.lastName,
      username: dto.username,
      cnic: dto.cnic,
    });

    const facultyRole = await this.roleService.findByName(ROLES.FACULTY);
    const defaultPassword = process.env.DEFAULT_FACULTY_PASSWORD || 'faculty123';

    return this.prisma.$transaction(async (tx) => {
      // Normalize employee number and username for consistent checking
      const normalizedEmployeeNumber = dto.employeeNumber.toUpperCase();
      const normalizedUsername = (dto.username || dto.employeeNumber).toLowerCase();

      console.log('[FacultyService.create] Normalized values:', {
        normalizedEmployeeNumber,
        normalizedUsername,
      });

      // 1. Check for existing records
      const [existingFaculty, existingUser] = await Promise.all([
        tx.faculty.findFirst({
          where: {
            OR: [
              { employeeNumber: normalizedEmployeeNumber },
              ...(dto.cnic ? [{ cnic: dto.cnic }] : []),
            ],
          },
        }),
        tx.user.findUnique({
          where: {
            username: normalizedUsername,
          },
        }),
      ]);

      console.log('[FacultyService.create] Existing records check:', {
        existingFaculty: existingFaculty
          ? {
              employeeNumber: existingFaculty.employeeNumber,
              cnic: existingFaculty.cnic,
            }
          : null,
        existingUser: existingUser ? { username: existingUser.username } : null,
      });

      if (existingFaculty?.employeeNumber === normalizedEmployeeNumber) {
        throw new ConflictException(
          `Faculty with employee number ${normalizedEmployeeNumber} already exists`,
        );
      }

      if (existingFaculty?.cnic === dto.cnic) {
        throw new ConflictException(`CNIC ${dto.cnic} is already registered`);
      }

      if (existingUser) {
        throw new ConflictException(
          `Username ${normalizedUsername} already exists`,
        );
      }

      // 2. Create user
      console.log('[FacultyService.create] Creating user...');
      const user = await this.userService.create(
        {
          username: normalizedUsername,
          password: dto.password || defaultPassword,
          roleId: facultyRole.id,
        },
        tx,
      );
      console.log(`[FacultyService.create] User created: ${user.id}`);

      // 3. Create faculty
      console.log('[FacultyService.create] Creating faculty record...');
      const faculty = await tx.faculty.create({
        data: {
          userId: user.id,
          employeeNumber: normalizedEmployeeNumber,
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
      console.log(`[FacultyService.create] Faculty created: ${faculty.id}`);

      console.log('[FacultyService.create] Fetching complete faculty details...');
      // Fetch within the same transaction to ensure data consistency
      const result = await tx.faculty.findUnique({
        where: { id: faculty.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      if (!result) {
        throw new BadRequestException('Failed to create faculty record');
      }

      console.log('[FacultyService.create] ✅ Success! Returning faculty data');
      return result as FacultyDetail;
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

  async findByUserId(userId: string): Promise<FacultyDetail> {
    const faculty = await this.prisma.faculty.findUnique({
      where: { userId },
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
      throw new NotFoundException('Faculty profile not found');
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

  async getAllocationDetails(facultyId: string, allocationId: string) {
    const allocation = await this.prisma.courseAllocation.findUnique({
      where: { id: allocationId },
      include: {
        course: true,
        section: {
          include: {
            batch: true,
          },
        },
        academicSession: true,
        faculty: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
    });

    if (!allocation) {
      throw new NotFoundException('Course allocation not found');
    }

    if (allocation.facultyId !== facultyId) {
      throw new NotFoundException('You do not have access to this allocation');
    }

    // Count enrolled students
    const studentCount = await this.prisma.courseEnrollment.count({
      where: {
        courseId: allocation.courseId,
        studentAcademicRecord: {
          sectionId: allocation.sectionId,
          semesterNumber: allocation.semesterNumber,
          academicSessionId: allocation.academicSessionId,
        },
        status: 'enrolled',
      },
    });

    return {
      ...allocation,
      studentCount,
    };
  }

  async getAllocationStudents(facultyId: string, allocationId: string) {
    const allocation = await this.prisma.courseAllocation.findUnique({
      where: { id: allocationId },
    });

    if (!allocation) {
      throw new NotFoundException('Course allocation not found');
    }

    if (allocation.facultyId !== facultyId) {
      throw new NotFoundException('You do not have access to this allocation');
    }

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: {
        courseId: allocation.courseId,
        studentAcademicRecord: {
          sectionId: allocation.sectionId,
          semesterNumber: allocation.semesterNumber,
          academicSessionId: allocation.academicSessionId,
        },
      },
      include: {
        studentAcademicRecord: {
          include: {
            student: {
              select: {
                id: true,
                stdRegNumber: true,
                firstName: true,
                middleName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        studentAcademicRecord: {
          student: {
            stdRegNumber: 'asc',
          },
        },
      },
    });

    return enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      status: enrollment.status,
      student: enrollment.studentAcademicRecord.student,
    }));
  }
}
