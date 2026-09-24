import type { Customer, ListOptions, Page, RequestOptions } from '../types.js';
import type { Transport } from '../transport.js';

export class CustomersResource {
  constructor(private readonly transport: Transport) {}

  async get(id: string, options: RequestOptions = {}): Promise<Customer> {
    return customerFromApi(await this.transport.get(`/v1/customers/${encodeURIComponent(id)}`, undefined, options.signal));
  }

  async list(options: ListOptions = {}): Promise<Page<Customer>> {
    const result = await this.transport.get<Record<string, unknown>>('/v1/customers', options, options.signal);
    const data = Array.isArray(result.data) ? result.data as Record<string, unknown>[] : [];
    return { ...result, data: data.map(customerFromApi), hasMore: Boolean(result.has_more), nextCursor: (result.next_cursor as string | null | undefined) ?? null, ...(result.total === undefined ? {} : { total: Number(result.total) }) };
  }
}

function customerFromApi(raw: Record<string, unknown>): Customer {
  return {
    ...raw, id: String(raw.id), merchantId: String(raw.merchant_id), email: String(raw.email),
    name: (raw.name as string | null | undefined) ?? null, phone: (raw.phone as string | null | undefined) ?? null,
    paymentCount: Number(raw.payment_count), createdAt: raw.created_at as string | undefined, updatedAt: raw.updated_at as string | undefined,
  };
}
