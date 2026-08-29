import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SignOptions } from 'jsonwebtoken';
import { DatabaseModule } from '../../database/database.module';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UserModule,
    DatabaseModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET is not defined');
        }

        return {
          secret,
          signOptions: {
            expiresIn: (process.env.JWT_EXPIRES_IN ??
              '1d') as SignOptions['expiresIn'],
          },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
