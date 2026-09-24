import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Plan } from '@prisma/client';
import OpenAI from 'openai';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WordsService } from '../words/words.service';

export type AudioMode = 'word' | 'example';

@Injectable()
export class AudioService {
  private readonly client: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly words: WordsService,
  ) {
    this.client = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async getAudio(
    userId: string,
    wordId: string,
    mode: AudioMode,
  ): Promise<{ bytes: Buffer; contentType: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.plan !== Plan.PREMIUM) {
      throw new ForbiddenException(
        'La voz Premium está disponible solo para suscriptores. Mejora tu plan para escuchar con voces de OpenAI.',
      );
    }

    const word = await this.words.getOwnedWord(userId, wordId);
    const text = mode === 'word' ? word.text : (word.example ?? word.text);
    const voice = this.config.get<string>('OPENAI_TTS_VOICE') ?? 'nova';
    const model = this.config.get<string>('OPENAI_TTS_MODEL') ?? 'tts-1';
    const textHash = this.hash(mode, text, voice);
    const ttlMs =
      (this.config.get<number>('AUDIO_CACHE_TTL_DAYS') ?? 90) *
      24 *
      60 *
      60 *
      1000;

    const cached = await this.prisma.audioCache.findUnique({
      where: { textHash },
    });
    if (cached) {
      const age = Date.now() - cached.createdAt.getTime();
      if (age < ttlMs) {
        return { bytes: Buffer.from(cached.bytes), contentType: 'audio/mpeg' };
      }
      await this.prisma.audioCache
        .delete({ where: { id: cached.id } })
        .catch(() => undefined);
    }

    await this.prisma.audioCache
      .deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - ttlMs) } },
      })
      .catch(() => undefined);

    const response = await this.client.audio.speech.create({
      model,
      voice,
      input: text,
      response_format: 'mp3',
    });

    const bytes = Buffer.from(await response.arrayBuffer());

    await this.prisma.audioCache.upsert({
      where: { textHash },
      update: {},
      create: { textHash, voice, bytes },
    });

    return { bytes, contentType: 'audio/mpeg' };
  }

  private hash(mode: string, text: string, voice: string): string {
    return crypto
      .createHash('sha256')
      .update(`${mode}:${text.toLowerCase()}:${voice}`)
      .digest('hex');
  }
}
