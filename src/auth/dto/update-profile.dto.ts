import { Transform } from 'class-transformer';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @IsString()
  steamName?: string;

  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @IsString()
  whatsappName?: string;

  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @IsString()
  discord?: string;
}
