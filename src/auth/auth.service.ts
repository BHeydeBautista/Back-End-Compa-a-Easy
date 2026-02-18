import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import * as crypto from 'node:crypto';
import { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/enums/user-role.enum';
import type { JwtPayload } from './types/jwt-payload.type';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { EmailService } from './email.service';
import { PendingRegistration } from './entities/pending-registration.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private isMissingPendingTableError(err: unknown) {
    // Postgres undefined_table is 42P01.
    if (err instanceof QueryFailedError) {
      const code = (err as any)?.driverError?.code;
      const message = String((err as any)?.driverError?.message ?? err.message);
      return code === '42P01' || message.toLowerCase().includes('pending_registration');
    }
    const msg = String((err as any)?.message ?? '');
    return msg.toLowerCase().includes('pending_registration');
  }

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectRepository(PendingRegistration)
    private readonly pendingRepo: Repository<PendingRegistration>,
  ) {}

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateVerificationToken() {
    return crypto.randomBytes(32).toString('base64url');
  }

  private async signUser(user: {
    id: number;
    name: string;
    email: string;
    role?: UserRole;
  }) {
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const email = String(registerDto.email ?? '')
      .trim()
      .toLowerCase();
    const name = String(registerDto.name ?? '').trim();

    const existing = await this.usersService.findOneByEmail(email);
    if (existing) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await bcryptjs.hash(registerDto.password, 10);
    const token = this.generateVerificationToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    // Preferred: double opt-in via PendingRegistration (no real User until verified).
    // Fallback: legacy user-table verification if the pending table isn't available.
    let pendingId: number | null = null;
    try {
      await this.pendingRepo.delete({ email });
      const pending = await this.pendingRepo.save({
        email,
        name,
        passwordHash,
        tokenHash,
        expiresAt,
      });
      pendingId = pending.id;

      await this.emailService.sendEmailVerification(email, token, name);
    } catch (err) {
      if (this.isMissingPendingTableError(err)) {
        this.logger.warn(
          'PendingRegistration table missing; falling back to legacy email verification flow. Consider enabling DB_SYNC=1 temporarily or adding migrations.',
        );

        const created = await this.usersService.create({
          name,
          email,
          password: passwordHash,
          isEmailVerified: false,
          emailVerifiedAt: null,
          emailVerificationTokenHash: tokenHash,
          emailVerificationTokenExpiresAt: expiresAt,
        });

        try {
          await this.emailService.sendEmailVerification(email, token, name);
        } catch (sendErr) {
          this.logger.error(
            `Failed to send verification email to ${email}`,
            sendErr instanceof Error ? sendErr.stack : String(sendErr),
          );

          try {
            await this.usersService.hardDeleteById(created.id);
          } catch (cleanupErr) {
            this.logger.error(
              `Failed to cleanup user after email send failure (id=${created.id})`,
              cleanupErr instanceof Error ? cleanupErr.stack : String(cleanupErr),
            );
          }

          throw new ServiceUnavailableException(
            'No se pudo enviar el correo de verificación. Intenta nuevamente en unos minutos.',
          );
        }

        return {
          ok: true,
          message:
            'Cuenta creada. Revisa tu correo para verificar tu cuenta (bandeja y spam).',
        };
      }

      this.logger.error(
        `Failed to create pending registration / send verification email for ${email}`,
        err instanceof Error ? err.stack : String(err),
      );

      if (pendingId) {
        try {
          await this.pendingRepo.delete({ id: pendingId });
        } catch {
          // Best-effort cleanup only.
        }
      }

      throw new ServiceUnavailableException(
        'No se pudo enviar el correo de verificación. Intenta nuevamente en unos minutos.',
      );
    }

    return {
      ok: true,
      message:
        'Cuenta creada. Revisa tu correo para verificar tu cuenta (bandeja y spam).',
    };
  }

  async verifyEmail(token: string) {
    const tokenHash = this.hashToken(token);

    // 1) Try PendingRegistration flow (preferred)
    try {
      const pending = await this.pendingRepo
        .createQueryBuilder('p')
        .addSelect('p.passwordHash')
        .addSelect('p.tokenHash')
        .addSelect('p.expiresAt')
        .where('p.tokenHash = :tokenHash', { tokenHash })
        .getOne();

      if (pending) {
        if (!pending.expiresAt || pending.expiresAt.getTime() < Date.now()) {
          throw new BadRequestException('Invalid or expired token');
        }

        const alreadyUser = await this.usersService.findOneByEmail(pending.email);
        if (alreadyUser) {
          await this.pendingRepo.delete({ id: pending.id });
          return { ok: true };
        }

        await this.usersService.create({
          name: pending.name,
          email: pending.email,
          password: pending.passwordHash,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          emailVerificationTokenHash: null,
          emailVerificationTokenExpiresAt: null,
        });

        await this.pendingRepo.delete({ id: pending.id });
        return { ok: true };
      }
    } catch (err) {
      if (!this.isMissingPendingTableError(err)) {
        throw err;
      }
      // Table missing: continue with legacy user-table verification.
    }

    // 2) Legacy user-table verification (for already-created unverified users)
    const match = await this.usersService.findOneByEmailVerificationTokenHash(
      tokenHash,
    );

    if (!match) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (match.isEmailVerified) {
      return { ok: true };
    }

    const expiresAt = match.emailVerificationTokenExpiresAt as Date | null;
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.usersService.markEmailVerified(match.id);
    return { ok: true };
  }

  async resendEmailVerification(email: string) {
    // Always return ok to avoid account enumeration.
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const user = await this.usersService.findOneByEmail(normalizedEmail);
    if (!user) {
      // Try pending registrations first (double opt-in). If table isn't present, just return ok.
      try {
        const pending = await this.pendingRepo.findOne({
          where: { email: normalizedEmail },
        });

        if (!pending) return { ok: true };

        const token = this.generateVerificationToken();
        const tokenHash = this.hashToken(token);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

        await this.pendingRepo.update(
          { id: pending.id },
          {
            tokenHash,
            expiresAt,
          },
        );

        try {
          await this.emailService.sendEmailVerification(
            normalizedEmail,
            token,
            pending.name,
          );
        } catch (err) {
          this.logger.error(
            `Failed to resend verification email to ${normalizedEmail}`,
            err instanceof Error ? err.stack : String(err),
          );
        }
      } catch (err) {
        if (!this.isMissingPendingTableError(err)) {
          this.logger.error(
            `Failed to resend verification email to ${normalizedEmail}`,
            err instanceof Error ? err.stack : String(err),
          );
        }
      }

      return { ok: true };
    }
    if (user.isEmailVerified) {
      return { ok: true };
    }

    // Legacy: if a user exists but is unverified, still allow sending a verification email.
    const token = this.generateVerificationToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await this.usersService.setEmailVerificationToken(user.id, {
      tokenHash,
      expiresAt,
    });

    await this.emailService.sendEmailVerification(user.email, token, user.name);
    return { ok: true };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findOneByEmail(loginDto.email, {
      withPassword: true,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    const isPasswordValid = await bcryptjs.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    return this.signUser(user);
  }

  async googleLogin(idToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('Google login not configured');
    }

    const googleClient = new OAuth2Client(clientId);

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    const name = payload?.name;
    const emailVerified = payload?.email_verified;

    if (!email) {
      throw new BadRequestException('Google account has no email');
    }
    if (emailVerified === false) {
      throw new BadRequestException('Google email not verified');
    }

    let user = await this.usersService.findOneByEmail(email);
    if (!user) {
      const displayName =
        (name && String(name).trim()) || email.split('@')[0] || 'Usuario';
      const randomPassword = crypto.randomBytes(48).toString('base64url');
      const passwordHash = await bcryptjs.hash(randomPassword, 10);

      user = await this.usersService.create({
        name: displayName,
        email,
        password: passwordHash,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      });
    } else if (!user.isEmailVerified) {
      // Google guarantees email_verified=true here.
      await this.usersService.markEmailVerified(user.id);
      const refreshed = await this.usersService.findOneByEmail(email);
      if (!refreshed) {
        throw new BadRequestException('User not found after verification');
      }
      user = refreshed;
    }

    if (!user) {
      throw new BadRequestException('User not available');
    }

    return this.signUser(user);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    if (!userId || !Number.isFinite(userId) || userId <= 0) {
      throw new UnauthorizedException('Invalid user');
    }

    const updated = await this.usersService.updateSelfProfile(userId, dto);
    return {
      user: {
        id: updated.id,
        name: updated.name,
        steamName: updated.steamName ?? null,
        whatsappName: updated.whatsappName ?? null,
        phoneNumber: updated.phoneNumber ?? null,
        discord: updated.discord ?? null,
      },
    };
  }
}
