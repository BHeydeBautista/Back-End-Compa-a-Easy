import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ProfilesController } from './profiles.controller';
import { PublicMembersController } from './public-members.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController, ProfilesController, PublicMembersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
