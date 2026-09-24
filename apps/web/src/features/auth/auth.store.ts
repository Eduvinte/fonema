import { create } from 'zustand';
import type { AuthResponse, User } from '../../shared/api/types';
import { api } from '../../shared/api/client';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: 'loading' | 'authenticated' | 'guest';
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  clear: () => void;
}

let refreshPromise: Promise<boolean> | null = null;

export async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const data = await api<AuthResponse>('/auth/refresh', {
          method: 'POST',
          skipAuthRefresh: true,
        });
        useAuthStore.setState({
          user: data.user,
          accessToken: data.accessToken,
          status: 'authenticated',
        });
        return true;
      } catch {
        useAuthStore.setState({ user: null, accessToken: null, status: 'guest' });
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  status: 'loading',

  bootstrap: async () => {
    if (get().status !== 'loading') return;
    await refreshSession();
  },

  login: async (email, password) => {
    const data = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuthRefresh: true,
    });
    set({ user: data.user, accessToken: data.accessToken, status: 'authenticated' });
  },

  register: async (email, password, name) => {
    const data = await api<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
      skipAuthRefresh: true,
    });
    set({ user: data.user, accessToken: data.accessToken, status: 'authenticated' });
  },

  logout: async () => {
    try {
      await api('/auth/logout', { method: 'POST', skipAuthRefresh: true });
    } finally {
      set({ user: null, accessToken: null, status: 'guest' });
    }
  },

  setSession: (user, accessToken) => set({ user, accessToken, status: 'authenticated' }),
  setUser: (user) => set({ user }),
  clear: () => set({ user: null, accessToken: null, status: 'guest' }),
}));
