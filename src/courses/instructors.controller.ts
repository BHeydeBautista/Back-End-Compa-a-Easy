import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { UserRole } from '../users/enums/user-role.enum';
import { AddCourseInstructorDto } from './dto/add-course-instructor.dto';
import { CoursesService } from './courses.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class InstructorsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('courses/:id/instructors')
  @Roles(UserRole.SUPER_ADMIN)
  listCourseInstructors(@Param('id') id: string) {
    return this.coursesService.listCourseInstructors(Number(id));
  }

  @Post('courses/:id/instructors')
  @Roles(UserRole.SUPER_ADMIN)
  addCourseInstructor(
    @Param('id') id: string,
    @Body() dto: AddCourseInstructorDto,
  ) {
    return this.coursesService.addCourseInstructor(Number(id), dto.userId);
  }

  @Delete('courses/:id/instructors/:userId')
  @Roles(UserRole.SUPER_ADMIN)
  removeCourseInstructor(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.coursesService.removeCourseInstructor(
      Number(id),
      Number(userId),
    );
  }

  @Get('instructors/me/courses')
  @Roles(UserRole.FORMACION, UserRole.SUPER_ADMIN)
  listMyCourses(@Request() req: AuthenticatedRequest) {
    return this.coursesService.listInstructorCourses(req.user.sub);
  }
}
