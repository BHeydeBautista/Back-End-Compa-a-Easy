import { IsInt, Min } from 'class-validator';

export class AddCoursePrerequisiteDto {
  @IsInt()
  @Min(1)
  prerequisiteCourseId: number;
}
