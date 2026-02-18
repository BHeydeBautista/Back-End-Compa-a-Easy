import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserCategory } from '../enums/user-category.enum';
import { UserDivision } from '../enums/user-division.enum';
import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(1)
  name: string;

  @Transform(({ value }) => value?.trim()?.toLowerCase())
  @IsEmail()
  email: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsInt()
  rankId?: number;

  @IsOptional()
  @IsEnum(UserCategory)
  category?: UserCategory;

  @IsOptional()
  @IsEnum(UserDivision)
  division?: UserDivision;

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
