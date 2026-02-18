import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  @IsEmail()
  email: string;
}
