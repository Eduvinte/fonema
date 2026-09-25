import { api } from '../../shared/api/client';
import type { Plan, UserRole } from '../../shared/api/types';

export interface AdminStats {
  totals: {
    users: number;
    usersToday: number;
    activeToday: number;
    active30d: number;
    sections: number;
    words: number;
    wordsGenerated: number;
    audioPlays: number;
    chatMessages: number;
    payments: number;
    revenue: number;
  };
  topEvents: Array<{ type: string; label: string; count: number }>;
  daily: Array<{ date: string; newUsers: number; events: number }>;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  plan: Plan;
  role: UserRole;
  createdAt: string;
  sectionCount: number;
  wordCount: number;
  chatMessageCount: number;
  lastEventAt: string | null;
  lastEventType: string | null;
}

export interface AdminUsersResponse {
  total: number;
  page: number;
  limit: number;
  users: AdminUser[];
}

export interface AdminActivityItem {
  id: string;
  type: string;
  label: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null } | null;
}

export const adminApi = {
  stats: () => api<AdminStats>('/admin/stats'),
  users: (search?: string, page = 1) =>
    api<AdminUsersResponse>(
      `/admin/users?search=${encodeURIComponent(search ?? '')}&page=${page}&limit=20`,
    ),
  activity: () => api<AdminActivityItem[]>('/admin/activity?limit=50'),
};
