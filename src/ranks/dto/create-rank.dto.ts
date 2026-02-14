import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRankDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
