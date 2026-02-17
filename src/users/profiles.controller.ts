import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UsersService } from './users.service';

@UseGuards(AuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  publicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(Number(id));
  }
}
