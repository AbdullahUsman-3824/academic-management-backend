import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { User } from '../../generated/prisma/client.js';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, LoginResult } from '../../common/types/auth';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
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
      username: user.username,
      roleId: user.roleId,
    };

    // Non-blocking lastLoginAt update — don't delay the response
    this.prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch((err: unknown) => {
        this.logger.error('Failed to update lastLoginAt', err);
      });

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }
}
