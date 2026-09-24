import { api } from '../../shared/api/client';
import type { BillingState, Plan } from '../../shared/api/types';

export const billingApi = {
  getState: () => api<BillingState>('/billing'),
  checkout: () => api<{ redirectUrl: string }>('/billing/checkout', { method: 'POST' }),
  registerStatus: () =>
    api<{ registered: boolean; creditCardType?: string; last4CardDigits?: string }>(
      '/billing/register-status',
    ),
  subscribe: () => api<{ subscriptionId: string }>('/billing/subscribe', { method: 'POST' }),
  sync: () => api<{ plan: Plan; activated: boolean }>('/billing/sync', { method: 'POST' }),
  cancel: () => api<{ ok: boolean }>('/billing/cancel', { method: 'POST' }),
};
