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
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AnalyticsModule,
    AuthModule,
    SectionsModule,
    WordsModule,
    AiModule,
    AudioModule,
    BillingModule,
    ChatModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
