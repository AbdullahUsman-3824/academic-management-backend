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

const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

// User minus the passwordHash field — this is the shape we actually
// return to callers/controllers.
export type SafeUser = Omit<User, 'passwordHash'>;

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

  /**
   * Return all users, ordered by creation date descending.
   */
  async findAll(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      omit: { passwordHash: true },
    });
  }

  /**
   * Return a single user by primary key.
   * Throws NotFoundException if not found.
   */
  async findById(id: number): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  /**
   * Find a user whose linked Student or Faculty profile has the given email.
   * Returns null when no matching profile exists.
   *
   * Note: email is stored on the Student/Faculty profiles, not on the User
   * record itself. passwordHash IS included here since this method is used
   * internally for login/credential lookup — see findByEmailForAuth vs this.
   */
  async findByEmail(email: string): Promise<User | null> {
    const userWithStudent = await this.prisma.user.findFirst({
      where: { student: { email } },
    });

    if (userWithStudent) return userWithStudent;

    return this.prisma.user.findFirst({
      where: { faculty: { email } },
    });
  }

  /**
   * Update an existing user by id.
   * If a new plaintext password is supplied, it is hashed before being
   * persisted; the plaintext value is never written to the database.
   * Throws NotFoundException if the user does not exist.
   */
  async update(id: number, data: UpdateUserDto): Promise<SafeUser> {
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

  /**
   * Set a user's status to 'inactive'.
   * Throws NotFoundException if the user does not exist.
   */
  async deactivate(id: number): Promise<SafeUser> {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: { status: USER_STATUS.INACTIVE },
      omit: { passwordHash: true },
    });
  }

  /**
   * Set a user's status to 'active'.
   * Throws NotFoundException if the user does not exist.
   */
  async activate(id: number): Promise<SafeUser> {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: { status: USER_STATUS.ACTIVE },
      omit: { passwordHash: true },
    });
  }

  /**
   * Verify a plaintext password against a user's stored Argon2 hash.
   */
  async verifyPassword(user: User, plainPassword: string): Promise<boolean> {
    return argon2.verify(user.passwordHash, plainPassword);
  }
}
