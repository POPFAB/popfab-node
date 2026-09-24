# popfab

The official Node.js and TypeScript SDK for the Popfab API.

Use `popfab` to accept payments, verify bank accounts, and initiate or track transfers without manually constructing HTTP requests or handling Popfab API authentication.

> The SDK is server-side only. Do not expose a Popfab secret key in a browser, mobile app, or other untrusted client.

## Requirements

- Node.js 20 or later
- A Popfab API key

## Install

```bash
npm install popfab
```

## Configure

```ts
import Popfab from 'popfab';

const popfab = new Popfab({
  apiKey: process.env.POPFAB_SECRET_KEY!,
  timeout: 15_000,      // optional; default is 15 seconds
  maxReadRetries: 2,    // optional; applies to GET requests only
});
```

The key determines the environment:

| Key prefix | Environment |
| --- | --- |
| `sk_test_` | Sandbox |
| `sk_live_` | Live |

The SDK rejects keys with an invalid prefix. It does not allow an application to independently override the environment selected by its key.

## Payments

### Initiate a payment

Payment initiation requires an idempotency key. Use a stable business value—usually your order ID—and save it before the first request.

```ts
const payment = await popfab.payments.initiate({
  amount: 25_000, // integer minor unit; ₦250.00 for NGN
  currency: 'NGN',
  reference: 'order_394',
  paymentMethod: 'card',
  customer: {
    email: 'ada@example.com',
    name: 'Ada Okafor',
  },
  callbackUrl: 'https://merchant.example/payments/callback',
}, {
  idempotencyKey: 'order_394',
});

console.log(payment.id, payment.status, payment.checkoutUrl);
```

Supported payment methods are `card`, `bank_transfer`, `ussd`, `mobile_money`, and `qr`.

### Retrieve, list, and sync payments

```ts
const payment = await popfab.payments.get('ppfb_pay_...');

const page = await popfab.payments.list({
  status: 'pending',
  limit: 25,
  cursor: 'optional_cursor',
});

for (const item of page.data) {
  console.log(item.reference, item.status);
}

// Ask Popfab to synchronise a payment with its provider.
const updated = await popfab.payments.sync('ppfb_pay_...', { force: true });
```

### Refund a payment

```ts
const refund = await popfab.payments.refund('ppfb_pay_...', {
  amount: 25_000, // omit for a provider-supported full refund
  reason: 'Customer request',
});
```

Refunds are never retried automatically. Keep your own durable business record before retrying an uncertain refund request.

## Transfers

### List banks and verify a recipient

Always verify a recipient before creating a transfer.

```ts
const { banks } = await popfab.transfers.listBanks('NGN');

const recipient = await popfab.transfers.verifyAccount({
  accountNumber: '0123456789',
  bankCode: '058',
});

console.log(recipient.accountName);
```

### Initiate a transfer

Transfers require an idempotency key. Use the same key if your application must retry after a timeout or network failure.

```ts
const transfer = await popfab.transfers.initiate({
  amount: 5_000,
  currency: 'NGN',
  reference: 'vendor_payout_394',
  recipient: {
    accountNumber: '0123456789',
    bankCode: '058',
    name: 'Ada Okafor', // use the verified account name
  },
  reason: 'Vendor payout',
}, {
  idempotencyKey: 'vendor_payout_394',
});

if (transfer.pendingConfirmation) {
  // Popfab is reconciling an uncertain provider outcome.
  // Do not submit a second transfer with a new reference.
}
```

### Bulk transfers

```ts
const batch = await popfab.transfers.initiateBulk({
  currency: 'NGN',
  transfers: [
    {
      amount: 5_000,
      reference: 'payout_001',
      recipient: { accountNumber: '0123456789', bankCode: '058', name: 'Ada Okafor' },
    },
    {
      amount: 7_500,
      reference: 'payout_002',
      recipient: { accountNumber: '0123456788', bankCode: '058', name: 'Tolu Ade' },
    },
  ],
}, { idempotencyKey: 'payroll_january_2026' });
```

### Retrieve and list transfers

```ts
const transfer = await popfab.transfers.get('ppfb_txfr_...');

const page = await popfab.transfers.list({
  status: 'pending',
  limit: 25,
});
```

Transfer statuses are `pending`, `queued`, `processing`, `success`, `failed`, and `reversed`.

## Idempotency and retries

`payments.initiate`, `transfers.initiate`, and `transfers.initiateBulk` require a caller-supplied `idempotencyKey`.

- Persist the key before the first request.
- Reuse the original key for a retry of the same business operation.
- Never reuse a key with different amount, recipient, or request details.
- The SDK retries safe `GET` requests only. It never automatically retries a payment, transfer, bulk transfer, or refund.

For an uncertain money-moving request, query the transaction/transfer by its Popfab ID or wait for a Popfab webhook. Do not create a new request simply because the network response was lost.

## Pagination

List methods return a page with `data`, `hasMore`, `nextCursor`, and sometimes `total`.

```ts
let cursor: string | undefined;
do {
  const page = await popfab.payments.list({ limit: 100, cursor });
  // Process page.data.
  cursor = page.nextCursor ?? undefined;
} while (cursor);
```

## Errors

All errors extend `PopfabError` and include a safe `message`, `type`, API `code`, `statusCode`, and Popfab `requestId` where available.

```ts
import { RateLimitError, ValidationError } from 'popfab';

try {
  await popfab.payments.initiate(paymentInput, { idempotencyKey: orderId });
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof ValidationError) {
    console.log(error.details);
  }
  throw error;
}
```

Available error classes include `AuthenticationError`, `ValidationError`, `IdempotencyError`, `RateLimitError`, `ApiError`, `NetworkError`, and `ConfigurationError`.

## Webhooks

Webhook signature verification is planned for the next SDK release. Until then, receive and verify Popfab webhooks using the platform’s webhook documentation and preserve the raw request body for signature verification.

Do not treat a webhook as a replacement for idempotency: webhook handlers must remain safe to run more than once.

## API surface

| Resource | Methods |
| --- | --- |
| `popfab.payments` | `initiate`, `get`, `list`, `sync`, `refund` |
| `popfab.transfers` | `listBanks`, `verifyAccount`, `initiate`, `initiateBulk`, `get`, `list` |

## Development

```bash
npm install
npm run check
npm test
npm run build
```

The package is tested with Node.js built-in test runner and TypeScript. A dry run before publishing is recommended:

```bash
npm pack --dry-run
```

## Security

- Store `POPFAB_SECRET_KEY` in a secret manager or server-side environment variable.
- Never commit keys or expose them in browser/mobile code.
- Use test keys in sandbox and live keys only in production.
- Verify recipient accounts before payouts.
- Log Popfab `requestId` values for support and reconciliation.

## Status

This is an active pre-release SDK. The public API will follow semantic versioning once the first stable version is released.
