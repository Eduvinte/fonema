import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AnalyticsEventType =
  | 'REGISTER'
  | 'LOGIN'
  | 'SECTION_CREATED'
  | 'SECTION_DELETED'
  | 'WORDS_ADDED'
  | 'WORDS_GENERATED'
  | 'AUDIO_PLAY'
  | 'CHAT_MESSAGE'
  | 'CHAT_ACTION_EXECUTED'
  | 'PAYMENT_RECEIVED'
  | 'SUBSCRIPTION_CREATED';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  track(
    type: AnalyticsEventType,
    userId?: string | null,
    metadata?: Record<string, unknown>,
  ) {
    const data: Prisma.AnalyticsEventCreateInput = {
      type,
      metadata: metadata
        ? (metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    };
    if (userId) {
      data.user = { connect: { id: userId } };
    }
    void this.prisma.analyticsEvent.create({ data }).catch(() => undefined);
  }
}
