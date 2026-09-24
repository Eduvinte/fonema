import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500, { message: 'Máximo 500 palabras por lista' })
  @IsString({ each: true })
  words?: string[];
}
