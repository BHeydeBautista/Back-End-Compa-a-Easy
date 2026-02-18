import { IsInt, Min } from 'class-validator';

export class InstructorApproveDto {
  @IsInt()
  @Min(1)
  userId: number;
}
