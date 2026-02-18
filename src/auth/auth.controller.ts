import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { MicrosoftLoginDto } from './dto/microsoft-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { SetProfileImageDto } from './dto/set-profile-image.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthGuard } from './guard/auth.guard';
import type { AuthenticatedRequest } from './types/authenticated-request.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendEmailVerification(dto.email);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  google(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto.idToken);
  }

  @Post('microsoft')
  microsoft(@Body() dto: MicrosoftLoginDto) {
    return this.authService.microsoftLogin(dto.idToken);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  profile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  updateProfile(
    @Body() dto: UpdateProfileDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  @Post('profile/avatar')
  @UseGuards(AuthGuard)
  setAvatar(
    @Body() dto: SetProfileImageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.authService.setAvatar(req.user.sub, dto.publicId);
  }

  @Post('profile/background')
  @UseGuards(AuthGuard)
  setBackground(
    @Body() dto: SetProfileImageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.authService.setBackground(req.user.sub, dto.publicId);
  }
}
