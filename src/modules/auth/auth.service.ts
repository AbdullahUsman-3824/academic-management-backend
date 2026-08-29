import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { User } from '../../generated/prisma/client.js';
import { UserService } from '../user/user.service';
import { RoleService } from '../user/role/role.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, LoginResult } from '../../common/types/auth';
import { SafeUser, UserResponse } from '../../common/types/user';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly roleService: RoleService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.userService.findByUsername(username);
    if (!user) return null;

    const isMatch = await this.userService.verifyPassword(user, password);
    if (!isMatch) return null;

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.validateUser(dto.username, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is inactive');
    }

    const payload: JwtPayload = {
      sub: user.id,
    };

    this.prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch((err: unknown) => {
        this.logger.error('Failed to update lastLoginAt', err);
      });

    return {
      accessToken: this.jwtService.sign(payload),
      user: await this.toUserResponse(user),
    };
  }

  async getMe(user: SafeUser): Promise<UserResponse> {
    return this.toUserResponse(user);
  }

  private async toUserResponse(user: SafeUser): Promise<UserResponse> {
    return {
      id: user.id,
      username: user.username,
      portal: await this.getPortal(user.roleId),
    };
  }

  private async getPortal(roleId: string): Promise<string> {
    const role = await this.roleService.findById(roleId);
    return role.name.toLowerCase();
  }
}
