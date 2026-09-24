import assert from 'node:assert/strict';
import test from 'node:test';
import Popfab from './index.js';

const apiKey = process.env.POPFAB_SANDBOX_SECRET_KEY;
const baseUrl = process.env.POPFAB_BASE_URL;

test('sandbox API contract: lists NGN banks without moving money', { skip: !apiKey }, async () => {
  const popfab = new Popfab({ apiKey: apiKey!, ...(baseUrl ? { baseUrl } : {}) });
  const result = await popfab.transfers.listBanks('NGN');

  assert.ok(Array.isArray(result.banks));
});

test('sandbox API contract: payment and transfer listings are accessible', { skip: !apiKey }, async () => {
  const popfab = new Popfab({ apiKey: apiKey!, ...(baseUrl ? { baseUrl } : {}) });
  const [payments, transfers] = await Promise.all([
    popfab.payments.list({ limit: 1 }),
    popfab.transfers.list({ limit: 1 }),
  ]);

  assert.ok(Array.isArray(payments.data));
  assert.ok(Array.isArray(transfers.data));
});
