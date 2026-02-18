import { IsInt, Min } from 'class-validator';

export class ConfirmAttendanceDto {
  @IsInt()
  @Min(1)
  userId: number;
}
