import { IsInt, Min } from 'class-validator';

export class AddCourseInstructorDto {
  @IsInt()
  @Min(1)
  userId: number;
}
