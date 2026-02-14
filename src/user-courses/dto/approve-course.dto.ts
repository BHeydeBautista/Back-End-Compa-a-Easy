import { IsInt, Min } from 'class-validator';

export class ApproveCourseDto {
  @IsInt()
  @Min(1)
  courseId: number;
}
