import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../users/entities/course.entity';
import { RankCourseUnlock } from '../users/entities/rank-course-unlock.entity';
import { UserApprovedCourse } from '../users/entities/user-approved-course.entity';
import { User } from '../users/entities/user.entity';
import { UserCoursesController } from './user-courses.controller';
import { UserCoursesService } from './user-courses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Course,
      UserApprovedCourse,
      RankCourseUnlock,
    ]),
  ],
  controllers: [UserCoursesController],
  providers: [UserCoursesService],
})
export class UserCoursesModule {}
