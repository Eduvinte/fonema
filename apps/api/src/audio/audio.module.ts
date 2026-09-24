import { Module } from '@nestjs/common';
import { WordsModule } from '../words/words.module';
import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';

@Module({
  imports: [WordsModule],
  controllers: [AudioController],
  providers: [AudioService],
})
export class AudioModule {}
