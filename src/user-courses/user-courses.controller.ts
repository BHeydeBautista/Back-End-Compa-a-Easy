import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { ApproveCourseDto } from './dto/approve-course.dto';
import { UserCoursesService } from './user-courses.service';

@UseGuards(AuthGuard)
@Controller('users/:userId/courses')
export class UserCoursesController {
  constructor(private readonly userCoursesService: UserCoursesService) {}

  private assertSelfOrSuperAdmin(requestUser: any, targetUserId: number) {
    const requesterIdRaw = requestUser?.sub;
    const requesterRole = requestUser?.role as UserRole | undefined;
    const requesterId = typeof requesterIdRaw === 'string' ? Number(requesterIdRaw) : requesterIdRaw;

    if (requesterRole === UserRole.SUPER_ADMIN) {
      return;
    }

    if (!requesterId || requesterId !== targetUserId) {
      throw new ForbiddenException('Forbidden');
    }
  }

  @Get('approved')
  listApproved(@Param('userId') userId: string, @Request() req: any) {
    const targetUserId = Number(userId);
    this.assertSelfOrSuperAdmin(req.user, targetUserId);
    return this.userCoursesService.listApproved(targetUserId);
  }

  @Post('approved')
  approve(
    @Param('userId') userId: string,
    @Body() dto: ApproveCourseDto,
    @Request() req: any,
  ) {
    const targetUserId = Number(userId);
    this.assertSelfOrSuperAdmin(req.user, targetUserId);
    return this.userCoursesService.approve(targetUserId, dto.courseId);
  }

  @Delete('approved/:courseId')
  unapprove(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
    @Request() req: any,
  ) {
    const targetUserId = Number(userId);
    this.assertSelfOrSuperAdmin(req.user, targetUserId);
    return this.userCoursesService.unapprove(targetUserId, Number(courseId));
  }

  @Get('available')
  listAvailable(@Param('userId') userId: string, @Request() req: any) {
    const targetUserId = Number(userId);
    this.assertSelfOrSuperAdmin(req.user, targetUserId);
    return this.userCoursesService.listAvailable(targetUserId);
  }

  @Get('dashboard')
  dashboard(@Param('userId') userId: string, @Request() req: any) {
    const targetUserId = Number(userId);
    this.assertSelfOrSuperAdmin(req.user, targetUserId);
    return this.userCoursesService.dashboard(targetUserId);
  }
}
