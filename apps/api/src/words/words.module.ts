import { Module } from '@nestjs/common';
import { SectionsModule } from '../sections/sections.module';
import { WordsController } from './words.controller';
import { WordsService } from './words.service';

@Module({
  imports: [SectionsModule],
  controllers: [WordsController],
  providers: [WordsService],
  exports: [WordsService],
})
export class WordsModule {}
