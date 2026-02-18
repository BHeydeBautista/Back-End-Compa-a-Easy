import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CourseType } from '../../users/enums/course-type.enum';

export class CreateCourseDto {
  @IsString()
  @MaxLength(40)
  code: string;

  @IsString()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CourseType)
  type?: CourseType;

  @IsOptional()
  @IsBoolean()
  requiresAllPreviousAscenso?: boolean;
}
