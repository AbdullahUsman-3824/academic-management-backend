import { User } from '../../generated/prisma/client.js';

export type SafeUser = Omit<User, 'passwordHash'>;
