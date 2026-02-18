import { IsEnum, IsString, Matches } from 'class-validator';
import { AttendanceType } from '../entities/attendance-session.entity';

export class CreateAttendanceSessionDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsEnum(AttendanceType)
  type: AttendanceType;
}
