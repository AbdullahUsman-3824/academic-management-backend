import { UserResponse } from './user.js';
export interface JwtPayload {
  sub: string;
}

export interface LoginResult {
  accessToken: string;
  user: UserResponse;
}
