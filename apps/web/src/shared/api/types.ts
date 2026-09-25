export type Plan = 'FREE' | 'PREMIUM';
export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: Plan;
  role: UserRole;
  aiWordsUsed: number;
  aiPeriodStart: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface SectionSummary {
  id: string;
  name: string;
  wordCount: number;
  createdAt: string;
}

export interface Word {
  id: string;
  sectionId: string;
  text: string;
  translation: string | null;
  example: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SectionDetail {
  id: string;
  name: string;
  createdAt: string;
  words: Word[];
}

export interface BillingState {
  plan: Plan;
  hasCard: boolean;
  card: { creditCardType?: string; last4CardDigits?: string } | null;
  subscriptionId: string | null;
}

export type AudioMode = 'word' | 'example';
