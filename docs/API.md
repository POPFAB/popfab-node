# SDK API reference

This reference documents the public API in `popfab` version `0.1.x`.

## Client

```ts
new Popfab({
  apiKey: string,
  baseUrl?: string,
  timeout?: number,
  maxReadRetries?: number,
  fetch?: typeof fetch,
})
```

`apiKey` must begin with `sk_test_` or `sk_live_`. The key selects sandbox or live mode. `baseUrl` defaults to `https://api.popfab.com` and is intended for controlled test/proxy use.

## Request options

```ts
{ idempotencyKey?: string; signal?: AbortSignal }
```

`idempotencyKey` is mandatory for `payments.initiate`, `transfers.initiate`, and `transfers.initiateBulk`.

## Payments

| Method | Description |
| --- | --- |
| `payments.initiate(input, options)` | Starts a payment. Requires an idempotency key. |
| `payments.get(id, options?)` | Retrieves one payment. |
| `payments.list(options?)` | Lists payments; accepts `status`, `provider`, `limit`, and `cursor`. |
| `payments.sync(id, { force? }?)` | Requests provider status synchronization. |
| `payments.refund(id, input, options?)` | Requests a full or partial refund. |

Payment initiation accepts an integer `amount`, 3-letter uppercase `currency`, Popfab `reference`, a payment method (`card`, `bank_transfer`, `ussd`, `mobile_money`, or `qr`), and a customer with email.

## Transfers

| Method | Description |
| --- | --- |
| `transfers.listBanks(currency?, providerId?, options?)` | Lists supported destination banks. |
| `transfers.verifyAccount(input, options?)` | Resolves a recipient account name. |
| `transfers.initiate(input, options)` | Initiates a single transfer. Requires an idempotency key. |
| `transfers.initiateBulk(input, options)` | Initiates a batch. Requires an idempotency key. |
| `transfers.get(id, options?)` | Retrieves one transfer. |
| `transfers.list(options?)` | Lists transfers; accepts `status`, `limit`, and `cursor`. |

All transfer amounts are integer minor units. Verify the recipient immediately before a payout. A result with `pendingConfirmation: true` must be reconciled rather than recreated with another reference.

## Webhooks

```ts
popfab.webhooks.constructEvent({
  payload: string | Uint8Array,
  signature: string | undefined,
  timestamp: string | number | undefined,
  webhookSecret: string,
  toleranceSeconds?: number,
})
```

The method verifies `X-POPFAB-Signature` and `X-POPFAB-Timestamp`, returning `{ id, type, apiVersion, createdAt, data }`. The signature is `sha256=` plus the HMAC-SHA256 hex digest of `<timestamp>.<raw body>`.

## Errors

All SDK errors extend `PopfabError`. The exported error classes are `AuthenticationError`, `ValidationError`, `IdempotencyError`, `RateLimitError`, `ApiError`, `NetworkError`, `ConfigurationError`, `WebhookSignatureError`, and `WebhookTimestampError`.

## Virtual accounts

| Method | Description |
| --- | --- |
| `virtualAccounts.create(input, options?)` | Creates or returns a virtual account for a customer. |
| `virtualAccounts.get(id, options?)` | Retrieves one virtual account. |
| `virtualAccounts.list(options?)` | Lists virtual accounts; accepts `limit` and `cursor`. |
| `virtualAccounts.deactivate(id, options?)` | Deactivates an existing virtual account. |

Creation requires `customerEmail` and `customerName`; optional fields are `customerPhone`, `preferredBank`, `providerId`, and `metadata`.

## Customers

| Method | Description |
| --- | --- |
| `customers.get(id, options?)` | Retrieves one customer. |
| `customers.list(options?)` | Lists customers; accepts `limit` and `cursor`. |
