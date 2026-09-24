import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsString,
  MaxLength,
} from 'class-validator';

export class BulkWordsDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'La lista de palabras no puede estar vacía' })
  @ArrayMaxSize(500, { message: 'Máximo 500 palabras por lista' })
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  words: string[];
}
