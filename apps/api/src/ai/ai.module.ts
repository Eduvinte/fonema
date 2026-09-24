import { Module } from '@nestjs/common';
import { SectionsModule } from '../sections/sections.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [SectionsModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
