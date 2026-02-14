import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../users/entities/course.entity';
import { CoursePrerequisite } from '../users/entities/course-prerequisite.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CoursePrerequisite])],
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}
