import { ConfigurationError } from '../errors.js';
import type { InitiatePaymentInput, Page, Payment, PaymentListOptions, RefundInput, RequestOptions, SyncOptions } from '../types.js';
import type { Transport } from '../transport.js';

export class PaymentsResource {
  constructor(private readonly transport: Transport) {}

  async initiate(input: InitiatePaymentInput, options: RequestOptions): Promise<Payment> {
    requireIdempotencyKey(options, 'payments.initiate');
    validatePaymentInput(input);
    const result = await this.transport.post<Record<string, unknown>>('/v1/payments', {
      amount: input.amount, currency: input.currency, reference: input.reference,
      payment_method: input.paymentMethod, customer: input.customer,
      callback_url: input.callbackUrl, metadata: input.metadata, routing_override: input.routingOverride,
    }, options);
    return paymentFromApi(result);
  }

  async get(id: string, options: RequestOptions = {}): Promise<Payment> {
    return paymentFromApi(await this.transport.get(`/v1/payments/${encodeURIComponent(id)}`, undefined, options.signal));
  }

  async list(options: PaymentListOptions = {}): Promise<Page<Payment>> {
    const page = await this.transport.get<Record<string, unknown>>('/v1/payments', options, options.signal);
    return pageFromApi(page);
  }

  async sync(id: string, options: SyncOptions = {}): Promise<Payment> {
    const query = options.force ? '?force=true' : '';
    return paymentFromApi(await this.transport.post(`/v1/payments/${encodeURIComponent(id)}/sync${query}`, {}, options));
  }

  async refund(id: string, input: RefundInput, options: RequestOptions = {}): Promise<Payment> {
    if (input.amount !== undefined && (!Number.isSafeInteger(input.amount) || input.amount <= 0)) {
      throw new ConfigurationError('refund amount must be a positive integer in minor units', 'ConfigurationError');
    }
    return paymentFromApi(await this.transport.post(`/v1/payments/${encodeURIComponent(id)}/refund`, input, options));
  }
}

function validatePaymentInput(input: InitiatePaymentInput): void {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new ConfigurationError('payment amount must be a positive integer in minor units', 'ConfigurationError');
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) {
    throw new ConfigurationError('payment currency must be a three-letter uppercase ISO code', 'ConfigurationError');
  }
  if (!/^[a-zA-Z0-9_-]{1,255}$/.test(input.reference)) {
    throw new ConfigurationError('payment reference must contain only letters, numbers, underscores, or hyphens', 'ConfigurationError');
  }
}

function paymentFromApi(raw: Record<string, unknown>): Payment {
  return {
    ...raw,
    id: String(raw.id),
    reference: String(raw.reference),
    amount: Number(raw.amount),
    currency: String(raw.currency),
    status: raw.status as Payment['status'],
    provider: (raw.provider as string | null | undefined) ?? null,
    providerReference: (raw.provider_reference as string | null | undefined) ?? null,
    checkoutUrl: (raw.checkout_url as string | null | undefined) ?? null,
    pendingConfirmation: Boolean(raw.pending_confirmation),
    paymentMethod: raw.payment_method as Payment['paymentMethod'],
    amountMinor: raw.amount_minor === undefined ? undefined : Number(raw.amount_minor),
    amountMinorUnit: raw.amount_minor_unit as string | undefined,
    failureReason: (raw.failure_reason as string | null | undefined) ?? null,
    createdAt: raw.created_at as string | undefined,
    updatedAt: raw.updated_at as string | undefined,
  };
}

function pageFromApi(raw: Record<string, unknown>): Page<Payment> {
  const data = Array.isArray(raw.data) ? raw.data as Record<string, unknown>[] : [];
  return {
    ...raw,
    data: data.map(paymentFromApi),
    hasMore: Boolean(raw.has_more),
    nextCursor: (raw.next_cursor as string | null | undefined) ?? null,
    ...(raw.total === undefined ? {} : { total: Number(raw.total) }),
  };
}

export function requireIdempotencyKey(options: RequestOptions | undefined, operation: string): asserts options is RequestOptions & { idempotencyKey: string } {
  if (!options?.idempotencyKey?.trim()) {
    throw new ConfigurationError(`${operation} requires a caller-supplied idempotencyKey`, 'ConfigurationError');
  }
}
