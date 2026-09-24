import { ConfigurationError } from '../errors.js';
import type { InitiatePaymentInput, ListOptions, Page, Payment, RefundInput, RequestOptions } from '../types.js';
import type { Transport } from '../transport.js';

export class PaymentsResource {
  constructor(private readonly transport: Transport) {}

  async initiate(input: InitiatePaymentInput, options: RequestOptions): Promise<Payment> {
    requireIdempotencyKey(options, 'payments.initiate');
    return this.transport.post<Payment>('/v1/payments', {
      amount: input.amount, currency: input.currency, reference: input.reference,
      payment_method: input.paymentMethod, customer: input.customer,
      callback_url: input.callbackUrl, metadata: input.metadata, routing_override: input.routingOverride,
    }, options);
  }

  get(id: string, options: RequestOptions = {}): Promise<Payment> {
    return this.transport.get<Payment>(`/v1/payments/${encodeURIComponent(id)}`, undefined, options.signal);
  }

  list(options: ListOptions = {}): Promise<Page<Payment>> {
    return this.transport.get<Page<Payment>>('/v1/payments', options, options.signal);
  }

  sync(id: string, options: RequestOptions = {}): Promise<Payment> {
    return this.transport.post<Payment>(`/v1/payments/${encodeURIComponent(id)}/sync`, {}, options);
  }

  refund(id: string, input: RefundInput, options: RequestOptions = {}): Promise<Payment> {
    return this.transport.post<Payment>(`/v1/payments/${encodeURIComponent(id)}/refund`, input, options);
  }
}

export function requireIdempotencyKey(options: RequestOptions | undefined, operation: string): asserts options is RequestOptions & { idempotencyKey: string } {
  if (!options?.idempotencyKey?.trim()) {
    throw new ConfigurationError(`${operation} requires a caller-supplied idempotencyKey`, 'ConfigurationError');
  }
}
