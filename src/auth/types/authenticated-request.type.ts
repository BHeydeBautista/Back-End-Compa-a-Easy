import type { Request } from 'express';
import type { JwtPayload } from './jwt-payload.type';

export type RequestWithAuth = Request & { user?: JwtPayload };

export type AuthenticatedRequest = Request & { user: JwtPayload };
