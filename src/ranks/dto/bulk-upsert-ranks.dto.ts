import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BulkRankItemDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class BulkUpsertRanksDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BulkRankItemDto)
  ranks: BulkRankItemDto[];
}
