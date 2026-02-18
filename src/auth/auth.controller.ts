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
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthGuard } from './guard/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  google(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto.idToken);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  profile(@Request() req: any) {
    return req.user;
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  updateProfile(@Body() dto: UpdateProfileDto, @Request() req: any) {
    const userIdRaw = req.user?.sub;
    const userId =
      typeof userIdRaw === 'string' ? Number(userIdRaw) : userIdRaw;
    return this.authService.updateProfile(userId, dto);
  }
}
