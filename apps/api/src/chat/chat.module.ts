import { Module } from '@nestjs/common';
import { SectionsModule } from '../sections/sections.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [SectionsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
