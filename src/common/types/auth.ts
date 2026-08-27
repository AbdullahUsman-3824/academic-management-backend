import { SafeUser } from './user.js';

export interface JwtPayload {
  sub: number;
  username: string;
  roleId: number;
}
export interface LoginResult {
  accessToken: string;
  user: SafeUser;
}
