import { refreshSession, useAuthStore } from '../../features/auth/auth.store';

const API_BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  skipAuthRefresh?: boolean;
  responseType?: 'json' | 'blob';
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuthRefresh, responseType = 'json', ...init } = options;
  const { accessToken } = useAuthStore.getState();

  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const doFetch = () =>
    fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });

  let response = await doFetch();

  if (response.status === 401 && !skipAuthRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) {
      const { accessToken: newToken } = useAuthStore.getState();
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        response = await doFetch();
      }
    } else {
      useAuthStore.getState().clear();
      throw new ApiError(401, 'Sesión expirada');
    }
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (responseType === 'blob') {
    const blob = await response.blob();
    if (!response.ok) throw new ApiError(response.status, `Error (${response.status})`);
    return blob as T;
  }
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      (data as { message?: string | string[] })?.message ?? `Error (${response.status})`;
    const msg = Array.isArray(message) ? message.join('. ') : message;
    throw new ApiError(response.status, msg, data);
  }

  return data as T;
}

export { API_BASE };
