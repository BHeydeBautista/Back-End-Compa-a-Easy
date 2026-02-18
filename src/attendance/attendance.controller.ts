import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { AttendanceService } from './attendance.service';
import { ConfirmAttendanceDto } from './dto/confirm-attendance.dto';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';

@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('sessions')
  listSessions() {
    return this.attendanceService.listSessions();
  }

  @Post('sessions')
  createSession(@Body() dto: CreateAttendanceSessionDto) {
    return this.attendanceService.createSession(dto);
  }

  @Get('sessions/:id/users')
  listSessionUsers(
    @Param('id') id: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.attendanceService.listSessionUsers(Number(id), {
      includeDeleted: includeDeleted === '1' || includeDeleted === 'true',
    });
  }

  @Post('sessions/:id/confirm')
  confirm(@Param('id') id: string, @Body() dto: ConfirmAttendanceDto) {
    return this.attendanceService.confirmAttendance(Number(id), dto);
  }

  @Delete('sessions/:id/confirm/:userId')
  unconfirm(@Param('id') id: string, @Param('userId') userId: string) {
    return this.attendanceService.unconfirmAttendance(Number(id), Number(userId));
  }
}
