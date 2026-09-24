import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { FlowService } from './flow.service';

const ENV: Record<string, string> = {
  FLOW_API_URL: 'https://sandbox.flow.cl/api',
  FLOW_API_KEY: 'TEST-KEY-123',
  FLOW_SECRET_KEY: 'test-secret',
};

function makeService(): FlowService {
  const config = {
    getOrThrow: (key: string) => ENV[key],
  } as unknown as ConfigService;
  return new FlowService(config);
}

function expectedSignature(params: Record<string, string>): string {
  const keys = Object.keys({ apiKey: ENV.FLOW_API_KEY, ...params }).sort();
  const toSign = keys
    .map((key) => key + { apiKey: ENV.FLOW_API_KEY, ...params }[key])
    .join('');
  return crypto
    .createHmac('sha256', ENV.FLOW_SECRET_KEY)
    .update(toSign)
    .digest('hex');
}

describe('FlowService', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => JSON.stringify({ customerId: 'cus_test' }),
    });
  });

  it('firma las peticiones GET con HMAC-SHA256 y parámetros ordenados', async () => {
    const service = makeService();
    await service.getCustomer('cus_test');

    const calls = (global.fetch as jest.Mock).mock.calls as unknown[][];
    const firstCall = calls[0];
    const url = firstCall[0] as string;
    const parsed = new URL(url);
    const signature = parsed.searchParams.get('s');
    const apiKey = parsed.searchParams.get('apiKey');
    const customerId = parsed.searchParams.get('customerId');

    expect(apiKey).toBe(ENV.FLOW_API_KEY);
    expect(customerId).toBe('cus_test');
    expect(signature).toBe(expectedSignature({ customerId: 'cus_test' }));
  });

  it('envía POST con body url-encoded y firma válida', async () => {
    const service = makeService();
    await service.cancelSubscription('sus_1');

    const calls = (global.fetch as jest.Mock).mock.calls as unknown[][];
    const [url, init] = calls[0] as [string, { body: string }];
    expect(url).toContain('/subscription/cancel');

    const params = new URLSearchParams(init.body);
    const received = Object.fromEntries(params.entries());
    const expected = {
      apiKey: ENV.FLOW_API_KEY,
      subscriptionId: 'sus_1',
      at_period_end: '0',
    };
    expect(received.s).toBe(expectedSignature(expected));
  });
});
