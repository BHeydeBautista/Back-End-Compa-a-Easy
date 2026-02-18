import { IsNotEmpty, IsString } from 'class-validator';

export class SetProfileImageDto {
  @IsString()
  @IsNotEmpty()
  publicId: string;
}
