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
import { CreateRankDto } from './dto/create-rank.dto';
import { CreateRankUnlockDto } from './dto/create-rank-unlock.dto';
import { UpdateRankDto } from './dto/update-rank.dto';
import { RanksService } from './ranks.service';

@UseGuards(AuthGuard)
@Controller('ranks')
export class RanksController {
  constructor(private readonly ranksService: RanksService) {}

  @Post()
  create(@Body() dto: CreateRankDto) {
    return this.ranksService.create(dto);
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
  update(@Param('id') id: string, @Body() dto: UpdateRankDto) {
    return this.ranksService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ranksService.remove(Number(id));
  }

  @Get(':id/unlocks')
  listUnlocks(@Param('id') id: string) {
    return this.ranksService.listUnlocks(Number(id));
  }

  @Post(':id/unlocks')
  addUnlock(@Param('id') id: string, @Body() dto: CreateRankUnlockDto) {
    return this.ranksService.addUnlock(Number(id), dto);
  }

  @Delete(':id/unlocks/:courseId')
  removeUnlock(@Param('id') id: string, @Param('courseId') courseId: string) {
    return this.ranksService.removeUnlock(Number(id), Number(courseId));
  }
}
