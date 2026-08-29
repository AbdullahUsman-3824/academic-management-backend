// src/common/types/express.d.ts
import type { SafeUser } from './user';

declare global {
  namespace Express {
    type User = SafeUser;
  }
}
