import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcryptjs from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import * as crypto from 'node:crypto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/enums/user-role.enum';
import type { JwtPayload } from './types/jwt-payload.type';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
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
    const existing = await this.usersService.findOneByEmail(registerDto.email);
    if (existing) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await bcryptjs.hash(registerDto.password, 10);

    const token = this.generateVerificationToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    const created = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      password: passwordHash,
      isEmailVerified: false,
      emailVerifiedAt: null,
      emailVerificationTokenHash: tokenHash,
      emailVerificationTokenExpiresAt: expiresAt,
    });

    try {
      await this.emailService.sendEmailVerification(
        created.email,
        token,
        created.name,
      );
    } catch (err) {
      // Don't leak SMTP details to the client. Keep the account unverified and allow resend.
      this.logger.error(
        `Failed to send verification email to ${created.email}`,
        err instanceof Error ? err.stack : String(err),
      );

      // Ensure we don't create accounts without a working verification channel.
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

  async verifyEmail(token: string) {
    const tokenHash = this.hashToken(token);

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
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      return { ok: true };
    }
    if (user.isEmailVerified) {
      return { ok: true };
    }

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
