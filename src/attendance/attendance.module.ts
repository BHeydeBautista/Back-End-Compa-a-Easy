import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceEntry } from './entities/attendance-entry.entity';
import { AttendanceSession } from './entities/attendance-session.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([AttendanceSession, AttendanceEntry, User]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
