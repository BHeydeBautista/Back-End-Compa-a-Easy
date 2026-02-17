import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('public/members')
export class PublicMembersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.listPublicMembers();
  }
}
