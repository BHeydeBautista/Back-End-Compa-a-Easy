import { IsNotEmpty, IsString } from 'class-validator';

export class MicrosoftLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
