import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Plan, Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { SectionsService } from '../sections/sections.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ChatActionDto, ChatActionPayload, ChatWord } from './chat.types';

const MAX_WORDS = 50;
const HISTORY_LIMIT = 20;

const WORDS_SCHEMA = {
  type: 'array' as const,
  maxItems: MAX_WORDS,
  description: 'Palabras con traducción y frase de ejemplo',
  items: {
    type: 'object' as const,
    properties: {
      word: {
        type: 'string' as const,
        description: 'La palabra en inglés',
      },
      translation: {
        type: 'string' as const,
        description: 'Traducción al español',
      },
      example: {
        type: 'string' as const,
        description: 'Frase corta de ejemplo en inglés',
      },
    },
    required: ['word', 'translation', 'example'],
    additionalProperties: false,
  },
};

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_section',
      description:
        'Propone crear una nueva sección de vocabulario con palabras, traducciones y frases de ejemplo. No la crea: solo la propone.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nombre corto de la sección (ej: Comida, Viajes)',
          },
          words: WORDS_SCHEMA,
        },
        required: ['name', 'words'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_words_to_section',
      description:
        'Propone añadir palabras a una sección existente del usuario. No las añade: solo las propone.',
      parameters: {
        type: 'object',
        properties: {
          sectionId: {
            type: 'string',
            description:
              'ID de la sección destino (de la lista de secciones del usuario)',
          },
          sectionName: {
            type: 'string',
            description:
              'Nombre de la sección destino (respaldo si no conoces el ID)',
          },
          words: WORDS_SCHEMA,
        },
        required: ['words'],
        additionalProperties: false,
      },
    },
  },
];

interface StreamEvents {
  onDelta: (text: string) => void;
  onAction: (action: ChatActionDto) => void;
}

@Injectable()
export class ChatService {
  private readonly client: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sections: SectionsService,
    private readonly analytics: AnalyticsService,
  ) {
    this.client = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async assertPremium(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.plan !== Plan.PREMIUM) {
      throw new ForbiddenException(
        'El asistente IA es exclusivo del plan Premium. Mejora tu plan para usar el chat.',
      );
    }
    return user;
  }

  async listConversations(userId: string) {
    const conversations = await this.prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true },
        },
      },
    });
    return conversations.map((c) => ({
      id: c.id,
      title: c.title,
      messageCount: c._count.messages,
      lastMessage: c.messages[0]?.content.slice(0, 80) ?? null,
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    }));
  }

  async createConversation(userId: string, title?: string) {
    const conversation = await this.prisma.chatConversation.create({
      data: {
        userId,
        title: title?.trim() ? title.trim().slice(0, 80) : 'Nueva conversación',
      },
    });
    return {
      id: conversation.id,
      title: conversation.title,
      messageCount: 0,
      lastMessage: null,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
    };
  }

  async deleteConversation(userId: string, conversationId: string) {
    const deleted = await this.prisma.chatConversation.deleteMany({
      where: { id: conversationId, userId },
    });
    if (deleted.count === 0)
      throw new NotFoundException('Conversación no encontrada');
    return { ok: true };
  }

  async getMessages(userId: string, conversationId: string) {
    await this.getOwnedConversation(userId, conversationId);
    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return messages.map((m) => this.toDto(m));
  }

  async dismiss(userId: string, messageId: string) {
    const updated = await this.prisma.chatMessage.updateMany({
      where: { id: messageId, userId, status: 'pending' },
      data: { status: 'dismissed' },
    });
    if (updated.count === 0)
      throw new NotFoundException('Mensaje no encontrado');
    return { ok: true };
  }

  async execute(userId: string, messageId: string) {
    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, userId },
    });
    if (!message || message.status !== 'pending' || !message.action) {
      throw new NotFoundException('Acción no encontrada o ya procesada');
    }

    const action = message.action as unknown as ChatActionPayload;
    let sectionId: string;
    let name: string;
    let wordCount: number;

    if (action.type === 'create_section') {
      const section = await this.sections.createEnriched(
        userId,
        action.name,
        action.words.map((w) => ({
          text: w.word,
          translation: w.translation,
          example: w.example,
        })),
      );
      sectionId = section.id;
      name = section.name;
      wordCount = section.words.length;
    } else {
      const target = await this.resolveSection(userId, action);
      const result = await this.sections.addWordsEnriched(
        userId,
        target.id,
        action.words.map((w) => ({
          text: w.word,
          translation: w.translation,
          example: w.example,
        })),
      );
      sectionId = target.id;
      name = target.name;
      wordCount = result.added;
    }

    await this.prisma.chatMessage.update({
      where: { id: message.id },
      data: { status: 'executed', executedSectionId: sectionId },
    });

    this.analytics.track('CHAT_ACTION_EXECUTED', userId, {
      actionType: action.type,
      sectionId,
      wordCount,
    });

    return { sectionId, name, wordCount };
  }

  async streamMessage(
    userId: string,
    conversationId: string,
    text: string,
    events: StreamEvents,
  ) {
    await this.assertPremium(userId);

    const conversation = await this.getOwnedConversation(
      userId,
      conversationId,
    );

    const messageCount = await this.prisma.chatMessage.count({
      where: { conversationId },
    });
    if (messageCount === 0) {
      await this.prisma.chatConversation.update({
        where: { id: conversation.id },
        data: { title: text.trim().slice(0, 80) },
      });
    }

    await this.prisma.chatMessage.create({
      data: { userId, conversationId, role: 'user', content: text },
    });
    this.analytics.track('CHAT_MESSAGE', userId, { conversationId });
    await this.prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    const history = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });

    const sectionsList = await this.prisma.section.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true },
    });

    const systemPrompt = this.buildSystemPrompt(sectionsList);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history
        .reverse()
        .map((m): OpenAI.Chat.Completions.ChatCompletionMessageParam => {
          if (m.role === 'user') return { role: 'user', content: m.content };
          const extra =
            m.status === 'executed' && m.executedSectionId
              ? `\n\n» Acción ya ejecutada: sección ${m.executedSectionId}`
              : m.status === 'dismissed'
                ? '\n\n» Acción descartada por el usuario'
                : '';
          return { role: 'assistant', content: m.content + extra };
        }),
    ];

    const model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
    const stream = await this.client.chat.completions.create({
      model,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      stream: true,
      temperature: 0.4,
    });

    let content = '';
    const toolCalls = new Map<number, { name: string; arguments: string }>();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        content += delta.content;
        events.onDelta(delta.content);
      }
      for (const tc of delta?.tool_calls ?? []) {
        const idx = tc.index;
        const current = toolCalls.get(idx) ?? { name: '', arguments: '' };
        if (tc.function?.name) current.name += tc.function.name;
        if (tc.function?.arguments) current.arguments += tc.function.arguments;
        toolCalls.set(idx, current);
      }
      if (chunk.choices[0]?.finish_reason) break;
    }

    const action = this.buildAction(toolCalls);
    if (!action) {
      const msg = await this.prisma.chatMessage.create({
        data: {
          userId,
          conversationId,
          role: 'assistant',
          content: content || 'Entendido 👍',
        },
      });
      return { messageId: msg.id, content: msg.content, action: null };
    }

    const dto = this.actionToDto(action);
    const msg = await this.prisma.chatMessage.create({
      data: {
        userId,
        conversationId,
        role: 'assistant',
        content,
        action: action as unknown as Prisma.InputJsonValue,
        status: 'pending',
      },
    });
    events.onAction(dto);
    return { messageId: msg.id, content, action: dto };
  }

  private async getOwnedConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation)
      throw new NotFoundException('Conversación no encontrada');
    return conversation;
  }

  private buildSystemPrompt(sections: Array<{ id: string; name: string }>) {
    const list = sections.length
      ? sections.map((s) => `- ${s.name} (id: ${s.id})`).join('\n')
      : '(el usuario aún no tiene secciones)';
    return [
      'Eres Fonema, el asistente de una app para practicar pronunciación de inglés.',
      'Cuando el usuario pida crear una sección o añadir palabras, DEBES llamar a la función correspondiente (create_section / add_words_to_section). La función solo registra una propuesta que el usuario confirmará en la interfaz: no ejecutas nada tú, la propuesta es tu forma de ofrecer el vocabulario.',
      `Secciones actuales del usuario:\n${list}`,
      'Reglas:',
      '- Palabras en inglés con traducción al español (acepción más común) y frase de ejemplo corta (máx 12 palabras).',
      `- Máximo ${MAX_WORDS} palabras por propuesta.`,
      '- Acompaña la llamada a la función con un texto breve y amable (ej: "¡Listo! Te propongo esta lista").',
      '- Si el pedido no implica crear/añadir vocabulario, responde solo con texto (pronunciación, gramática, consejos, etc).',
      '- Responde en español, breve y amable.',
    ].join('\n');
  }

  private buildAction(
    toolCalls: Map<number, { name: string; arguments: string }>,
  ): ChatActionPayload | null {
    if (toolCalls.size === 0) return null;
    const first = toolCalls.get(Math.min(...toolCalls.keys()));
    if (!first) return null;

    let args: Record<string, unknown>;
    try {
      args = JSON.parse(first.arguments) as Record<string, unknown>;
    } catch {
      return null;
    }

    const words = this.cleanWords(args.words);
    if (!words || words.length === 0) return null;

    if (first.name === 'create_section') {
      const name = typeof args.name === 'string' ? args.name.trim() : '';
      if (!name) return null;
      return { type: 'create_section', name: name.slice(0, 100), words };
    }

    if (first.name === 'add_words_to_section') {
      return {
        type: 'add_words',
        sectionId:
          typeof args.sectionId === 'string' ? args.sectionId : undefined,
        sectionName:
          typeof args.sectionName === 'string' ? args.sectionName : undefined,
        words,
      };
    }

    return null;
  }

  private cleanWords(raw: unknown): ChatWord[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const words: ChatWord[] = [];
    for (const item of raw.slice(0, MAX_WORDS)) {
      if (typeof item !== 'object' || item === null) continue;
      const record = item as Record<string, unknown>;
      if (
        typeof record.word !== 'string' ||
        typeof record.translation !== 'string' ||
        typeof record.example !== 'string'
      ) {
        continue;
      }
      const word = record.word.trim().replace(/\s+/g, ' ');
      const translation = record.translation.trim();
      const example = record.example.trim();
      if (!word || !translation || !example) continue;
      const key = word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      words.push({ word, translation, example });
    }
    return words;
  }

  private async resolveSection(
    userId: string,
    action: Extract<ChatActionPayload, { type: 'add_words' }>,
  ) {
    if (action.sectionId) {
      try {
        return await this.sections.getOwnedSection(userId, action.sectionId);
      } catch {
        // seguimos al fallback por nombre
      }
    }
    if (action.sectionName) {
      const name = action.sectionName.trim().toLowerCase();
      const sections = await this.prisma.section.findMany({
        where: { userId },
      });
      const match = sections.find((s) => s.name.trim().toLowerCase() === name);
      if (match) return match;
    }
    throw new BadRequestException(
      'No se encontró la sección destino. Crea la sección primero o indica su nombre exacto.',
    );
  }

  private actionToDto(action: ChatActionPayload): ChatActionDto {
    if (action.type === 'create_section') {
      return {
        type: 'create_section',
        name: action.name,
        wordCount: action.words.length,
        preview: action.words.slice(0, 4).map((w) => w.word),
      };
    }
    return {
      type: 'add_words',
      sectionName: action.sectionName,
      wordCount: action.words.length,
      preview: action.words.slice(0, 4).map((w) => w.word),
    };
  }

  private toDto(message: {
    id: string;
    role: string;
    content: string;
    action: Prisma.JsonValue | null;
    status: string;
    executedSectionId: string | null;
    createdAt: Date;
  }) {
    const action = message.action as unknown as ChatActionPayload | null;
    return {
      id: message.id,
      role: message.role as 'user' | 'assistant',
      content: message.content,
      action: action ? this.actionToDto(action) : null,
      status: message.status,
      executedSectionId: message.executedSectionId,
      createdAt: message.createdAt,
    };
  }
}
