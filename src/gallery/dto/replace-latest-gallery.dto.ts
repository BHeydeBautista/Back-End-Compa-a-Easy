import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReplaceLatestGalleryDto {
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  publicIds: string[];
}
