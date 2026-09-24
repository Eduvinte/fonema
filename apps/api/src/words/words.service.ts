import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateWordDto } from './dto/update-word.dto';

@Injectable()
export class WordsService {
  constructor(private readonly prisma: PrismaService) {}

  async update(userId: string, wordId: string, dto: UpdateWordDto) {
    await this.getOwnedWord(userId, wordId);
    return this.prisma.word.update({
      where: { id: wordId },
      data: {
        text: dto.text?.trim(),
        translation: dto.translation?.trim(),
        example: dto.example?.trim(),
      },
    });
  }

  async remove(userId: string, wordId: string) {
    await this.getOwnedWord(userId, wordId);
    await this.prisma.word.delete({ where: { id: wordId } });
    return { ok: true };
  }

  async getOwnedWord(userId: string, wordId: string) {
    const word = await this.prisma.word.findFirst({
      where: { id: wordId, section: { userId } },
    });
    if (!word) {
      throw new NotFoundException('Palabra no encontrada');
    }
    return word;
  }
}
