import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../users/entities/course.entity';
import { CourseInstructor } from '../users/entities/course-instructor.entity';
import { CoursePrerequisite } from '../users/entities/course-prerequisite.entity';
import { RankCourseUnlock } from '../users/entities/rank-course-unlock.entity';
import { UserApprovedCourse } from '../users/entities/user-approved-course.entity';
import { User } from '../users/entities/user.entity';
import { InstructorCoursesController } from './instructor-courses.controller';
import { UserCoursesController } from './user-courses.controller';
import { UserCoursesService } from './user-courses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Course,
      CourseInstructor,
      CoursePrerequisite,
      UserApprovedCourse,
      RankCourseUnlock,
    ]),
  ],
  controllers: [UserCoursesController, InstructorCoursesController],
  providers: [UserCoursesService],
})
export class UserCoursesModule {}
