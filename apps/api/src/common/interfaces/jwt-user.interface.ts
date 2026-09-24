import { Plan } from '@prisma/client';

export interface JwtUser {
  id: string;
  email: string;
  name: string | null;
  plan: Plan;
  aiWordsUsed: number;
  aiPeriodStart: Date;
}

export interface TokenPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
}
