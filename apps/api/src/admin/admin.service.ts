import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const EVENT_LABELS: Record<string, string> = {
  REGISTER: 'Registro',
  LOGIN: 'Inicio de sesión',
  SECTION_CREATED: 'Sección creada',
  SECTION_DELETED: 'Sección eliminada',
  WORDS_ADDED: 'Palabras añadidas',
  WORDS_GENERATED: 'Palabras generadas (IA)',
  AUDIO_PLAY: 'Audio reproducido',
  CHAT_MESSAGE: 'Mensaje al asistente',
  CHAT_ACTION_EXECUTED: 'Acción de chat ejecutada',
  PAYMENT_RECEIVED: 'Pago recibido',
  SUBSCRIPTION_CREATED: 'Suscripción creada',
};

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      usersToday,
      activeToday,
      active30d,
      totalSections,
      totalWords,
      totalChatMessages,
      payments,
      topEvents,
      newUsers30d,
      events30d,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: now } } }),
      this.prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: now } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.section.count(),
      this.prisma.word.count(),
      this.prisma.chatMessage.count(),
      this.prisma.payment.findMany({
        where: { status: 2 },
        select: { amount: true },
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['type'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
      this.prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
    ]);

    const wordsGenerated = await this.sumCountMetadata(
      'WORDS_GENERATED',
      thirtyDaysAgo,
    );
    const audioPlays = await this.sumCountMetadata('AUDIO_PLAY', thirtyDaysAgo);
    const revenue = payments.reduce((acc, p) => acc + p.amount, 0);

    const daily = this.buildDailySeries(newUsers30d, events30d);

    return {
      totals: {
        users: totalUsers,
        usersToday,
        activeToday: activeToday.length,
        active30d: active30d.length,
        sections: totalSections,
        words: totalWords,
        wordsGenerated,
        audioPlays,
        chatMessages: totalChatMessages,
        payments: payments.length,
        revenue,
      },
      topEvents: topEvents
        .map((e) => ({
          type: e.type,
          label: EVENT_LABELS[e.type] ?? e.type,
          count: e._count._all,
        }))
        .sort((a, b) => b.count - a.count),
      daily,
    };
  }

  async getUsers(search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          role: true,
          createdAt: true,
          _count: { select: { sections: true, chatMessages: true } },
          sections: {
            select: { _count: { select: { words: true } } },
          },
          events: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true, type: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        plan: u.plan,
        role: u.role,
        createdAt: u.createdAt,
        sectionCount: u._count.sections,
        wordCount: u.sections.reduce((acc, s) => acc + s._count.words, 0),
        chatMessageCount: u._count.chatMessages,
        lastEventAt: u.events[0]?.createdAt ?? null,
        lastEventType: u.events[0]?.type ?? null,
      })),
    };
  }

  async getActivity(limit = 50) {
    const events = await this.prisma.analyticsEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        metadata: true,
        createdAt: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
    return events.map((e) => ({
      id: e.id,
      type: e.type,
      label: EVENT_LABELS[e.type] ?? e.type,
      metadata: e.metadata,
      createdAt: e.createdAt,
      user: e.user
        ? { id: e.user.id, email: e.user.email, name: e.user.name }
        : null,
    }));
  }

  private async sumCountMetadata(type: string, since: Date): Promise<number> {
    const events = await this.prisma.analyticsEvent.findMany({
      where: { type, createdAt: { gte: since } },
      select: { metadata: true },
    });
    return events.reduce((acc, e) => {
      const meta = e.metadata as { count?: unknown } | null;
      const value = typeof meta?.count === 'number' ? meta.count : 0;
      return acc + value;
    }, 0);
  }

  private buildDailySeries(
    newUsers: Array<{ createdAt: Date }>,
    events: Array<{ createdAt: Date }>,
  ) {
    const days: Array<{
      date: string;
      newUsers: number;
      events: number;
    }> = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = 29; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = dayKey(day);
      days.push({
        date: key,
        newUsers: newUsers.filter((u) => dayKey(u.createdAt) === key).length,
        events: events.filter((e) => dayKey(e.createdAt) === key).length,
      });
    }
    return days;
  }
}
