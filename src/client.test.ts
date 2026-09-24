import assert from 'node:assert/strict';
import test from 'node:test';
import Popfab, { ConfigurationError, RateLimitError } from './index.js';

test('maps a camelCase transfer request to the public API contract', async () => {
  let request: Request | undefined;
  const popfab = new Popfab({
    apiKey: 'sk_test_example',
    baseUrl: 'https://api.example.test',
    fetch: async (input, init) => {
      request = new Request(input, init);
      return Response.json({ id: 'trf_1', status: 'pending', reference: 'payout-1' });
    },
  });

  const transfer = await popfab.transfers.initiate({
    amount: 5_000, currency: 'NGN', reference: 'payout-1',
    recipient: { accountNumber: '0123456789', bankCode: '058', name: 'Ada' },
  }, { idempotencyKey: 'payout-1' });

  assert.equal(popfab.environment, 'sandbox');
  assert.equal(transfer.status, 'pending');
  assert.equal(request?.headers.get('authorization'), 'Bearer sk_test_example');
  assert.equal(request?.headers.get('idempotency-key'), 'payout-1');
  assert.deepEqual(await request?.json(), {
    amount: 5_000, currency: 'NGN', reference: 'payout-1',
    recipient: { account_number: '0123456789', bank_code: '058', name: 'Ada' },
  });
});

test('requires a persisted caller idempotency key for transfers', () => {
  const popfab = new Popfab({ apiKey: 'sk_test_example', fetch: globalThis.fetch });
  assert.throws(() => popfab.transfers.initiate({
    amount: 5_000, currency: 'NGN', reference: 'payout-1',
    recipient: { accountNumber: '0123456789', bankCode: '058', name: 'Ada' },
  }, {}), ConfigurationError);
});

test('maps payments, list pagination, and sync to the gateway contract', async () => {
  const requests: Request[] = [];
  const popfab = new Popfab({
    apiKey: 'sk_test_example', baseUrl: 'https://api.example.test',
    fetch: async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      if (request.url.includes('/sync')) return Response.json({ id: 'pay_1', reference: 'order-1', amount: 25000, currency: 'NGN', status: 'success' });
      if (request.method === 'GET') return Response.json({
        data: [{ id: 'pay_1', reference: 'order-1', amount: 25000, amount_minor: 25000, currency: 'NGN', status: 'pending', provider_reference: 'ref_1', pending_confirmation: true }],
        has_more: true, next_cursor: 'cursor_2', total: 3,
      });
      return Response.json({ id: 'pay_1', reference: 'order-1', amount: 25000, currency: 'NGN', status: 'pending', checkout_url: 'https://checkout.example.test' });
    },
  });

  const payment = await popfab.payments.initiate({
    amount: 25_000, currency: 'NGN', reference: 'order-1', paymentMethod: 'card',
    customer: { email: 'ada@example.test', name: 'Ada' }, callbackUrl: 'https://merchant.test/callback',
  }, { idempotencyKey: 'order-1' });
  const page = await popfab.payments.list({ status: 'pending', limit: 10 });
  const synced = await popfab.payments.sync('pay_1', { force: true });

  assert.equal(payment.checkoutUrl, 'https://checkout.example.test');
  assert.equal(page.data[0].providerReference, 'ref_1');
  assert.equal(page.data[0].pendingConfirmation, true);
  assert.equal(page.nextCursor, 'cursor_2');
  assert.equal(synced.status, 'success');
  assert.equal(requests[0].headers.get('idempotency-key'), 'order-1');
  assert.deepEqual(await requests[0].json(), {
    amount: 25_000, currency: 'NGN', reference: 'order-1', payment_method: 'card',
    customer: { email: 'ada@example.test', name: 'Ada' }, callback_url: 'https://merchant.test/callback',
  });
  assert.equal(new URL(requests[1].url).searchParams.get('status'), 'pending');
  assert.equal(new URL(requests[2].url).searchParams.get('force'), 'true');
});

test('maps public API errors to typed SDK errors without retrying money requests', async () => {
  let calls = 0;
  const popfab = new Popfab({
    apiKey: 'sk_test_example', maxReadRetries: 3,
    fetch: async () => {
      calls += 1;
      return Response.json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Slow down' } }, { status: 429, headers: { 'retry-after': '30' } });
    },
  });

  await assert.rejects(
    popfab.payments.initiate({ amount: 1, currency: 'NGN', reference: 'order-1', paymentMethod: 'card', customer: { email: 'ada@example.test' } }, { idempotencyKey: 'order-1' }),
    (error: unknown) => error instanceof RateLimitError && error.retryAfter === 30,
  );
  assert.equal(calls, 1);

  const invalidKey = () => new Popfab({ apiKey: 'not-a-popfab-key' });
  assert.throws(invalidKey, ConfigurationError);
});
