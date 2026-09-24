import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

type Params = Record<string, string | number | undefined>;

export interface PaymentStatus {
  flowOrder: number;
  commerceOrder: string;
  status: number;
  subject: string;
  amount: number | string;
  payer: string;
}

export interface CustomerInfo {
  customerId: string;
  creditCardType?: string;
  last4CardDigits?: string;
  status?: string;
}

@Injectable()
export class FlowService {
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.getOrThrow<string>('FLOW_API_URL');
  }

  async createCustomer(
    name: string,
    email: string,
    externalId: string,
  ): Promise<string> {
    const data = await this.post<{ customerId: string }>('/customer/create', {
      name,
      email,
      externalId,
    });
    return data.customerId;
  }

  async getCustomer(customerId: string): Promise<CustomerInfo> {
    return this.get<CustomerInfo>('/customer/get', { customerId });
  }

  async registerCard(
    customerId: string,
    urlReturn: string,
  ): Promise<{ url: string; token: string }> {
    return this.post<{ url: string; token: string }>('/customer/register', {
      customerId,
      url_return: urlReturn,
    });
  }

  async getRegisterStatus(token: string): Promise<{
    status: string;
    creditCardType?: string;
    last4CardDigits?: string;
  }> {
    return this.get('/customer/getRegisterStatus', { token });
  }

  async createSubscription(
    customerId: string,
    planId: string,
  ): Promise<{ subscriptionId: string }> {
    return this.post<{ subscriptionId: string }>('/subscription/create', {
      customerId,
      planId,
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.post('/subscription/cancel', {
      subscriptionId,
      at_period_end: 0,
    });
  }

  async getPaymentStatus(token: string): Promise<PaymentStatus> {
    return this.get<PaymentStatus>('/payment/getStatus', { token });
  }

  async getPaymentsByDate(date: string): Promise<PaymentStatus[]> {
    const result = await this.get<{ data?: PaymentStatus[]; total?: number }>(
      '/payment/getPayments',
      { date, limit: 100 },
    );
    return result.data ?? [];
  }

  async getCustomerSubscriptions(
    customerId: string,
  ): Promise<
    Array<{ subscriptionId: string; status: number; planId: string }>
  > {
    const result = await this.get<{
      data?: Array<{ subscriptionId: string; status: number; planId: string }>;
      total?: number;
    }>('/customer/getSubscriptions', { customerId, limit: 100 });
    return result.data ?? [];
  }

  async getSubscription(subscriptionId: string): Promise<{
    customerId: string;
    invoices?: Array<{ payment?: PaymentStatus | null }>;
  }> {
    return this.get<{
      customerId: string;
      invoices?: Array<{ payment?: PaymentStatus | null }>;
    }>('/subscription/get', { subscriptionId });
  }

  private async get<T>(path: string, params: Params): Promise<T> {
    const signed = this.sign(params);
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(signed)) {
      qs.append(key, String(value));
    }
    const response = await fetch(`${this.baseUrl}${path}?${qs.toString()}`);
    return this.handle<T>(response);
  }

  private async post<T>(path: string, params: Params): Promise<T> {
    const signed = this.sign(params);
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(signed)) {
      body.append(key, String(value));
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    return this.handle<T>(response);
  }

  private async handle<T>(response: Response): Promise<T> {
    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(
        `Flow devolvió una respuesta inválida: ${text.slice(0, 200)}`,
      );
    }

    if (!response.ok) {
      const message =
        (data as { message?: string })?.message ??
        `Error de Flow (HTTP ${response.status})`;
      throw new BadGatewayException(`Flow: ${message}`);
    }

    return data as T;
  }

  private sign(params: Params): Record<string, string> {
    const apiKey = this.config.getOrThrow<string>('FLOW_API_KEY');
    const secretKey = this.config.getOrThrow<string>('FLOW_SECRET_KEY');

    const all: Record<string, string> = { apiKey };
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        all[key] = String(value);
      }
    }

    const sortedKeys = Object.keys(all).sort();
    const toSign = sortedKeys.map((key) => key + all[key]).join('');
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(toSign)
      .digest('hex');

    return { ...all, s: signature };
  }
}
