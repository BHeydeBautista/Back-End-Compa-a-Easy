import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRankUnlockDto {
  @IsInt()
  @Min(1)
  courseId: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  note?: string;
}
