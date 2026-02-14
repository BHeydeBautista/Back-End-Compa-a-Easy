import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ApproveCourseDto } from './dto/approve-course.dto';
import { UserCoursesService } from './user-courses.service';

@UseGuards(AuthGuard)
@Controller('users/:userId/courses')
export class UserCoursesController {
  constructor(private readonly userCoursesService: UserCoursesService) {}

  @Get('approved')
  listApproved(@Param('userId') userId: string) {
    return this.userCoursesService.listApproved(Number(userId));
  }

  @Post('approved')
  approve(@Param('userId') userId: string, @Body() dto: ApproveCourseDto) {
    return this.userCoursesService.approve(Number(userId), dto.courseId);
  }

  @Delete('approved/:courseId')
  unapprove(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.userCoursesService.unapprove(Number(userId), Number(courseId));
  }

  @Get('available')
  listAvailable(@Param('userId') userId: string) {
    return this.userCoursesService.listAvailable(Number(userId));
  }

  @Get('dashboard')
  dashboard(@Param('userId') userId: string) {
    return this.userCoursesService.dashboard(Number(userId));
  }
}
