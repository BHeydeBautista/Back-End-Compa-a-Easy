import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../users/entities/course.entity';
import { RankCourseUnlock } from '../users/entities/rank-course-unlock.entity';
import { Rank } from '../users/entities/rank.entity';
import { RanksController } from './ranks.controller';
import { RanksService } from './ranks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rank, Course, RankCourseUnlock])],
  controllers: [RanksController],
  providers: [RanksService],
})
export class RanksModule {}
