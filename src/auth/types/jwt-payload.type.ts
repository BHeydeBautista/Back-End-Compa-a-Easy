import type { UserRole } from '../../users/enums/user-role.enum';

export interface JwtPayload {
  sub: number;
  email: string;
  name: string;
  role?: UserRole;
  iat?: number;
  exp?: number;
}
