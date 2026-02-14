import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateRankDto } from './dto/create-rank.dto';
import { BulkUpsertRanksDto } from './dto/bulk-upsert-ranks.dto';
import { CreateRankUnlockDto } from './dto/create-rank-unlock.dto';
import { UpdateRankDto } from './dto/update-rank.dto';
import { RanksService } from './ranks.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller('ranks')
export class RanksController {
  constructor(private readonly ranksService: RanksService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateRankDto) {
    return this.ranksService.create(dto);
  }

  @Post('bulk')
  @Roles(UserRole.SUPER_ADMIN)
  bulkUpsert(@Body() dto: BulkUpsertRanksDto) {
    return this.ranksService.bulkUpsert(dto);
  }

  @Get()
  findAll() {
    return this.ranksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ranksService.findOne(Number(id));
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateRankDto) {
    return this.ranksService.update(Number(id), dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.ranksService.remove(Number(id));
  }

  @Get(':id/unlocks')
  @Roles(UserRole.SUPER_ADMIN)
  listUnlocks(@Param('id') id: string) {
    return this.ranksService.listUnlocks(Number(id));
  }

  @Post(':id/unlocks')
  @Roles(UserRole.SUPER_ADMIN)
  addUnlock(@Param('id') id: string, @Body() dto: CreateRankUnlockDto) {
    return this.ranksService.addUnlock(Number(id), dto);
  }

  @Delete(':id/unlocks/:courseId')
  @Roles(UserRole.SUPER_ADMIN)
  removeUnlock(@Param('id') id: string, @Param('courseId') courseId: string) {
    return this.ranksService.removeUnlock(Number(id), Number(courseId));
  }
}
