import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(10)
  token: string;
}
