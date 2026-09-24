import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenPayload } from '../common/interfaces/jwt-user.interface';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';

export const REFRESH_COOKIE = 'refresh_token';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new BadRequestException('Ya existe una cuenta con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name: dto.name?.trim() || null },
    });

    const tokens = await this.issueTokens(user.id, email);
    return { user: this.toSafeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.issueTokens(user.id, user.email);
    return { user: this.toSafeUser(user), ...tokens };
  }

  async refresh(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Sesión expirada, inicia sesión de nuevo',
      );
    }

    if (stored.revokedAt) {
      const graceMs = 15_000;
      const revokedAgo = Date.now() - stored.revokedAt.getTime();
      if (revokedAgo > graceMs) {
        throw new UnauthorizedException(
          'Sesión expirada, inicia sesión de nuevo',
        );
      }
    } else {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
    }

    const tokens = await this.issueTokens(stored.user.id, stored.user.email);
    return { user: this.toSafeUser(stored.user), ...tokens };
  }

  async logout(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.toSafeUser(user);
  }

  private async issueTokens(userId: string, email: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, type: 'access' } satisfies TokenPayload,
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_TTL'),
      },
    );

    const refreshToken = await this.jwt.signAsync(
      {
        sub: userId,
        email,
        type: 'refresh',
        jti: crypto.randomUUID(),
      } satisfies TokenPayload & { jti: string },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: `${this.config.get('JWT_REFRESH_TTL_DAYS')}d`,
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(
          Date.now() +
            this.config.get('JWT_REFRESH_TTL_DAYS') * 24 * 60 * 60 * 1000,
        ),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private toSafeUser(user: {
    id: string;
    email: string;
    name: string | null;
    plan: string;
    aiWordsUsed: number;
    aiPeriodStart: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      aiWordsUsed: user.aiWordsUsed,
      aiPeriodStart: user.aiPeriodStart,
    };
  }
}
