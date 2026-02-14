import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { ApproveCourseDto } from './dto/approve-course.dto';
import { UserCoursesService } from './user-courses.service';
import type { Request } from 'express';

@UseGuards(AuthGuard, RolesGuard)
@Controller('users/:userId/courses')
export class UserCoursesController {
  constructor(private readonly userCoursesService: UserCoursesService) {}

  private assertSelfOrSuperAdmin(request: Request, userId: number) {
    const authUser = (request as any).user as { sub?: number; role?: UserRole };
    if (authUser?.role === UserRole.SUPER_ADMIN) return;
    if (typeof authUser?.sub === 'number' && authUser.sub === userId) return;
    throw new ForbiddenException();
  }

  @Get('approved')
  listApproved(@Req() req: Request, @Param('userId') userId: string) {
    const id = Number(userId);
    this.assertSelfOrSuperAdmin(req, id);
    return this.userCoursesService.listApproved(id);
  }

  @Post('approved')
  @Roles(UserRole.SUPER_ADMIN)
  approve(@Param('userId') userId: string, @Body() dto: ApproveCourseDto) {
    return this.userCoursesService.approve(Number(userId), dto.courseId);
  }

  @Delete('approved/:courseId')
  @Roles(UserRole.SUPER_ADMIN)
  unapprove(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.userCoursesService.unapprove(Number(userId), Number(courseId));
  }

  @Get('available')
  listAvailable(@Req() req: Request, @Param('userId') userId: string) {
    const id = Number(userId);
    this.assertSelfOrSuperAdmin(req, id);
    return this.userCoursesService.listAvailable(id);
  }

  @Get('dashboard')
  dashboard(@Req() req: Request, @Param('userId') userId: string) {
    const id = Number(userId);
    this.assertSelfOrSuperAdmin(req, id);
    return this.userCoursesService.dashboard(id);
  }
}
