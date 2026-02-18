import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcryptjs from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import * as crypto from 'node:crypto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private async signUser(user: {
    id: number;
    name: string;
    email: string;
    role?: any;
  }) {
    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      role: (user as any).role,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: (user as any).role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.usersService.findOneByEmail(registerDto.email);
    if (existing) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await bcryptjs.hash(registerDto.password, 10);
    const created = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      password: passwordHash,
    });

    return created;
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
      });
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
