import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { UserRole } from '../users/enums/user-role.enum';
import { InstructorApproveDto } from './dto/instructor-approve.dto';
import { UserCoursesService } from './user-courses.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.FORMACION, UserRole.SUPER_ADMIN)
@Controller('instructor/courses')
export class InstructorCoursesController {
  constructor(private readonly userCoursesService: UserCoursesService) {}

  @Get()
  listMyCourses(@Request() req: AuthenticatedRequest) {
    return this.userCoursesService.listInstructorCourses(
      req.user.sub,
      req.user.role,
    );
  }

  @Get(':courseId/candidates')
  candidates(
    @Param('courseId') courseId: string,
    @Request() req: AuthenticatedRequest,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('includeIneligible') includeIneligible?: string,
  ) {
    return this.userCoursesService.listInstructorCandidates(
      req.user.sub,
      req.user.role,
      Number(courseId),
      {
        includeDeleted: includeDeleted === '1' || includeDeleted === 'true',
        includeIneligible:
          includeIneligible === '1' || includeIneligible === 'true',
      },
    );
  }

  @Post(':courseId/approve')
  approve(
    @Param('courseId') courseId: string,
    @Body() dto: InstructorApproveDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.userCoursesService.instructorApprove(
      req.user.sub,
      req.user.role,
      Number(courseId),
      dto.userId,
    );
  }

  @Delete(':courseId/approve/:userId')
  unapprove(
    @Param('courseId') courseId: string,
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.userCoursesService.instructorUnapprove(
      req.user.sub,
      req.user.role,
      Number(courseId),
      Number(userId),
    );
  }
}
