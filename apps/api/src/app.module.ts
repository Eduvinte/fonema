import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { SectionsModule } from './sections/sections.module';
import { WordsModule } from './words/words.module';
import { AiModule } from './ai/ai.module';
import { AudioModule } from './audio/audio.module';
import { BillingModule } from './billing/billing.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    SectionsModule,
    WordsModule,
    AiModule,
    AudioModule,
    BillingModule,
    ChatModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
