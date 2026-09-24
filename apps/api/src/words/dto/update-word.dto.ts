import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWordDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  translation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  example?: string;
}
