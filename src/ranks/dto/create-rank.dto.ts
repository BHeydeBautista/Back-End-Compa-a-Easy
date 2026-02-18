import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { UserDivision } from '../../users/enums/user-division.enum';

export class CreateRankDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsEnum(UserDivision)
  division?: UserDivision;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
