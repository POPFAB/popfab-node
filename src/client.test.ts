import assert from 'node:assert/strict';
import test from 'node:test';
import Popfab, { ConfigurationError } from './index.js';

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
