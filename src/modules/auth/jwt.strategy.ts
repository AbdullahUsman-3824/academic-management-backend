import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../user/user.service';
import { JwtPayload } from '../../common/types/auth';
import { SafeUser } from '../../common/types/user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UserService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => {
          const token = (req.cookies as Record<string, string> | undefined)?.[
            'access_token'
          ];
          return token ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<SafeUser> {
    try {
      return await this.userService.findById(payload.sub);
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new UnauthorizedException();
      }
      throw err;
    }
  }
}
