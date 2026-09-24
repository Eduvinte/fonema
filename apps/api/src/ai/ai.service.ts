import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Plan } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { SectionsService } from '../sections/sections.service';
import { PaymentRequiredException } from '../common/exceptions/payment-required.exception';

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 50;

interface EnrichedWord {
  word: string;
  translation: string;
  example: string;
}

@Injectable()
export class AiService {
  private readonly client: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sections: SectionsService,
  ) {
    this.client = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async enrichSection(
    userId: string,
    sectionId: string,
    onBatch: (words: EnrichedWord[], done: number, total: number) => void,
  ): Promise<{ enriched: number }> {
    const section = await this.sections.getOwnedSection(userId, sectionId);
    const pending = section.words
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((w) => !w.translation || !w.example);

    if (pending.length === 0) {
      return { enriched: 0 };
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Usuario no encontrado');

    if (user.plan !== Plan.PREMIUM) {
      const available = await this.checkFreeQuota(user);
      if (pending.length > available) {
        throw new PaymentRequiredException(
          `Solo te quedan ${available} palabras de IA este mes. Mejora a Premium para generar sin límites.`,
          { available },
        );
      }
    }

    let enrichedTotal = 0;
    const batches = this.chunk(pending, BATCH_SIZE);

    for (const batch of batches) {
      const results = await this.generateBatch(batch.map((w) => w.text));
      const byKey = new Map(
        results.map((r) => [r.word.trim().toLowerCase(), r]),
      );

      const updates = [];
      for (const word of batch) {
        const result = byKey.get(word.text.trim().toLowerCase());
        if (!result) continue;
        updates.push({
          id: word.id,
          translation: result.translation,
          example: result.example,
        });
      }

      if (updates.length > 0) {
        await this.prisma.$transaction(
          updates.map((u) =>
            this.prisma.word.update({
              where: { id: u.id },
              data: { translation: u.translation, example: u.example },
            }),
          ),
        );
      }

      enrichedTotal += updates.length;
      await this.prisma.user.update({
        where: { id: userId },
        data: { aiWordsUsed: { increment: updates.length } },
      });

      onBatch(
        updates.map((u) => ({
          word: batch.find((w) => w.id === u.id)!.text,
          translation: u.translation,
          example: u.example,
        })),
        enrichedTotal,
        pending.length,
      );
    }

    return { enriched: enrichedTotal };
  }

  private async checkFreeQuota(user: {
    id: string;
    aiWordsUsed: number;
    aiPeriodStart: Date;
  }): Promise<number> {
    const limit = this.config.get<number>('FREE_MONTHLY_AI_LIMIT') ?? 50;
    const now = Date.now();
    const periodStart = user.aiPeriodStart.getTime();

    if (now - periodStart > MONTH_MS) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { aiWordsUsed: 0, aiPeriodStart: new Date() },
      });
      return limit;
    }

    return Math.max(0, limit - user.aiWordsUsed);
  }

  private async generateBatch(words: string[]): Promise<EnrichedWord[]> {
    const model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';

    const completion = await this.client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You are an English-Spanish vocabulary assistant. Given a JSON object with an array of English words, return a JSON object with key "words" containing an array where each item has: "word" (the original word), "translation" (Spanish translation of its most common meaning), "example" (a short natural example sentence in English, maximum 12 words, using the word). Return ONLY valid JSON.',
        },
        {
          role: 'user',
          content: JSON.stringify({ words }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    try {
      const parsed = JSON.parse(content) as { words?: EnrichedWord[] };
      if (!Array.isArray(parsed.words)) return [];
      return parsed.words.filter(
        (w) =>
          typeof w.word === 'string' &&
          typeof w.translation === 'string' &&
          typeof w.example === 'string',
      );
    } catch {
      return [];
    }
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      result.push(items.slice(i, i + size));
    }
    return result;
  }
}
