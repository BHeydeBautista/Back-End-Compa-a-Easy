import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../users/entities/course.entity';
import { CoursePrerequisite } from '../users/entities/course-prerequisite.entity';
import { CourseInstructor } from '../users/entities/course-instructor.entity';
import { User } from '../users/entities/user.entity';
import { CoursesController } from './courses.controller';
import { InstructorsController } from './instructors.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CoursePrerequisite,
      CourseInstructor,
      User,
    ]),
  ],
  controllers: [CoursesController, InstructorsController],
  providers: [CoursesService],
})
export class CoursesModule {}
