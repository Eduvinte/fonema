import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const sections = await this.prisma.section.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { words: true } } },
    });

    return sections.map((s) => ({
      id: s.id,
      name: s.name,
      wordCount: s._count.words,
      createdAt: s.createdAt,
    }));
  }

  async create(userId: string, dto: CreateSectionDto) {
    const words = this.normalizeWords(dto.words ?? []);
    const section = await this.prisma.section.create({
      data: {
        name: dto.name.trim(),
        userId,
        words: {
          create: words.map((text, i) => ({ text, sortOrder: i })),
        },
      },
      include: { words: { orderBy: { sortOrder: 'asc' } } },
    });
    return section;
  }

  async getOne(userId: string, sectionId: string) {
    const section = await this.getOwnedSection(userId, sectionId);
    return {
      id: section.id,
      name: section.name,
      createdAt: section.createdAt,
      words: section.words.sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }

  async update(userId: string, sectionId: string, dto: UpdateSectionDto) {
    await this.getOwnedSection(userId, sectionId);
    const section = await this.prisma.section.update({
      where: { id: sectionId },
      data: { name: dto.name?.trim() },
    });
    return section;
  }

  async remove(userId: string, sectionId: string) {
    await this.getOwnedSection(userId, sectionId);
    await this.prisma.section.delete({ where: { id: sectionId } });
    return { ok: true };
  }

  async addWords(userId: string, sectionId: string, rawWords: string[]) {
    const section = await this.getOwnedSection(userId, sectionId);

    const words = this.normalizeWords(rawWords);
    if (words.length === 0) return { added: 0 };

    const existing = await this.prisma.word.findMany({
      where: { sectionId: section.id },
      select: { text: true },
    });
    const existingSet = new Set(existing.map((w) => w.text.toLowerCase()));

    const toAdd = words.filter((w) => !existingSet.has(w.toLowerCase()));
    const maxOrder = await this.prisma.word.aggregate({
      where: { sectionId: section.id },
      _max: { sortOrder: true },
    });
    const startOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    await this.prisma.word.createMany({
      data: toAdd.map((text, i) => ({
        sectionId: section.id,
        text,
        sortOrder: startOrder + i,
      })),
    });

    return { added: toAdd.length, skipped: words.length - toAdd.length };
  }

  async createEnriched(
    userId: string,
    name: string,
    words: Array<{ text: string; translation: string; example: string }>,
  ) {
    const cleaned = this.normalizeEnriched(words);
    const section = await this.prisma.section.create({
      data: {
        name: name.trim(),
        userId,
        words: {
          create: cleaned.map((w, i) => ({
            text: w.text,
            translation: w.translation,
            example: w.example,
            sortOrder: i,
          })),
        },
      },
      include: { words: { orderBy: { sortOrder: 'asc' } } },
    });
    return section;
  }

  async addWordsEnriched(
    userId: string,
    sectionId: string,
    words: Array<{ text: string; translation: string; example: string }>,
  ) {
    const section = await this.getOwnedSection(userId, sectionId);

    const cleaned = this.normalizeEnriched(words);
    const existing = await this.prisma.word.findMany({
      where: { sectionId: section.id },
      select: { text: true },
    });
    const existingSet = new Set(existing.map((w) => w.text.toLowerCase()));
    const toAdd = cleaned.filter((w) => !existingSet.has(w.text.toLowerCase()));

    const maxOrder = await this.prisma.word.aggregate({
      where: { sectionId: section.id },
      _max: { sortOrder: true },
    });
    const startOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    await this.prisma.word.createMany({
      data: toAdd.map((w, i) => ({
        sectionId: section.id,
        text: w.text,
        translation: w.translation,
        example: w.example,
        sortOrder: startOrder + i,
      })),
    });

    return { added: toAdd.length, skipped: cleaned.length - toAdd.length };
  }

  async getOwnedSection(userId: string, sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, userId },
      include: { words: true },
    });
    if (!section) {
      throw new NotFoundException('Sección no encontrada');
    }
    return section;
  }

  private normalizeWords(raw: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const word of raw) {
      const clean = word.trim().replace(/\s+/g, ' ');
      if (!clean) continue;
      const key = clean.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(clean);
    }
    return result;
  }

  private normalizeEnriched(
    raw: Array<{ text: string; translation: string; example: string }>,
  ): Array<{ text: string; translation: string; example: string }> {
    const seen = new Set<string>();
    const result: Array<{
      text: string;
      translation: string;
      example: string;
    }> = [];
    for (const item of raw) {
      const text = item.text.trim().replace(/\s+/g, ' ');
      const translation = item.translation.trim();
      const example = item.example.trim();
      if (!text || !translation || !example) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ text, translation, example });
    }
    return result;
  }
}
