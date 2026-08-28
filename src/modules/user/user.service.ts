import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, User } from '../../generated/prisma/client.js';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SafeUser } from '../../common/types/user';
import { USER_STATUS } from '../../common/constants/user-status';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user.
   * Throws ConflictException if the username is already taken.
   */
  async create(data: CreateUserDto): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existing) {
      throw new ConflictException(
        `Username "${data.username}" is already in use`,
      );
    }

    const { password: _password, ...rest } = data;

    const passwordHash = await argon2.hash(data.password);

    return this.prisma.user.create({
      data: { ...rest, passwordHash },
      omit: { passwordHash: true },
    });
  }

  async findAll(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      omit: { passwordHash: true },
    });
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findByEmail(email: string): Promise<User | null> {
    const userWithStudent = await this.prisma.user.findFirst({
      where: { student: { email } },
    });

    if (userWithStudent) return userWithStudent;

    return this.prisma.user.findFirst({
      where: { faculty: { email } },
    });
  }

  async update(id: string, data: UpdateUserDto): Promise<SafeUser> {
    await this.findById(id);

    const { password, ...rest } = data;

    const updateData: Prisma.UserUncheckedUpdateInput = {
      ...rest,
      ...(password ? { passwordHash: await argon2.hash(password) } : {}),
    };

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      omit: { passwordHash: true },
    });
  }

  async deactivate(id: string): Promise<SafeUser> {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: { status: USER_STATUS.INACTIVE },
      omit: { passwordHash: true },
    });
  }

  async activate(id: string): Promise<SafeUser> {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: { status: USER_STATUS.ACTIVE },
      omit: { passwordHash: true },
    });
  }

  async verifyPassword(user: User, plainPassword: string): Promise<boolean> {
    return argon2.verify(user.passwordHash, plainPassword);
  }
}
