import { User } from '../../generated/prisma/client.js';

export type SafeUser = Omit<User, 'passwordHash'>;

export interface UserResponse {
  id: string;
  username: string;
  portal: string;
}
