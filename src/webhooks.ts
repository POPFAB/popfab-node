import { createHmac, timingSafeEqual } from 'node:crypto';
import { ConfigurationError, WebhookSignatureError, WebhookTimestampError } from './errors.js';
import type { ConstructWebhookEventInput, WebhookEvent } from './types.js';

export class WebhooksResource {
  constructEvent(input: ConstructWebhookEventInput): WebhookEvent {
    if (!input.webhookSecret) throw new ConfigurationError('webhookSecret is required', 'ConfigurationError');
    const timestamp = parseTimestamp(input.timestamp);
    if (timestamp === null) throw new WebhookTimestampError('X-POPFAB-Timestamp is missing or invalid', 'WebhookTimestampError');
    const toleranceMs = (input.toleranceSeconds ?? 300) * 1_000;
    if (!Number.isFinite(toleranceMs) || toleranceMs < 0) throw new ConfigurationError('toleranceSeconds must be a non-negative number', 'ConfigurationError');
    if (Math.abs((input.now ?? Date.now()) - timestamp) > toleranceMs) {
      throw new WebhookTimestampError('Webhook timestamp is outside the permitted tolerance', 'WebhookTimestampError');
    }

    const payload = typeof input.payload === 'string' ? input.payload : Buffer.from(input.payload).toString('utf8');
    const signature = input.signature?.trim();
    if (!signature?.startsWith('sha256=')) throw new WebhookSignatureError('X-POPFAB-Signature is missing or malformed', 'WebhookSignatureError');
    const actual = signature.slice('sha256='.length);
    const expected = createHmac('sha256', input.webhookSecret).update(`${input.timestamp}.${payload}`, 'utf8').digest('hex');
    if (!safeEqualHex(expected, actual)) throw new WebhookSignatureError('Webhook signature verification failed', 'WebhookSignatureError');

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch (cause) {
      throw new WebhookSignatureError('Webhook payload is not valid JSON', 'WebhookSignatureError', undefined, undefined, undefined, undefined, { cause });
    }
    const event = parsed as Record<string, unknown>;
    if (!event.id || !event.type || !event.api_version || !event.created_at || !event.data || typeof event.data !== 'object') {
      throw new WebhookSignatureError('Webhook payload does not match the Popfab event schema', 'WebhookSignatureError');
    }
    return {
      id: String(event.id), type: String(event.type), apiVersion: String(event.api_version),
      createdAt: String(event.created_at), data: event.data as Record<string, unknown>,
    };
  }
}

function parseTimestamp(value: string | number | undefined): number | null {
  if (value === undefined || value === '' || !/^\d+$/.test(String(value))) return null;
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) ? timestamp : null;
}

function safeEqualHex(expected: string, actual: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(actual)) return false;
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(actual, 'hex');
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}
