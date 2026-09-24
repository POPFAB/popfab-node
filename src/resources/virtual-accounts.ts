import { ConfigurationError } from '../errors.js';
import type { CreateVirtualAccountInput, ListOptions, Page, RequestOptions, VirtualAccount } from '../types.js';
import type { Transport } from '../transport.js';

export class VirtualAccountsResource {
  constructor(private readonly transport: Transport) {}

  async create(input: CreateVirtualAccountInput, options: RequestOptions = {}): Promise<VirtualAccount> {
    if (!input.customerEmail.trim() || !input.customerName.trim()) {
      throw new ConfigurationError('customerEmail and customerName are required', 'ConfigurationError');
    }
    return virtualAccountFromApi(await this.transport.post<Record<string, unknown>>('/v1/virtual-accounts', {
      customer_email: input.customerEmail, customer_name: input.customerName,
      customer_phone: input.customerPhone, preferred_bank: input.preferredBank,
      provider_id: input.providerId, metadata: input.metadata,
    }, options));
  }

  async get(id: string, options: RequestOptions = {}): Promise<VirtualAccount> {
    return virtualAccountFromApi(await this.transport.get(`/v1/virtual-accounts/${encodeURIComponent(id)}`, undefined, options.signal));
  }

  async list(options: ListOptions = {}): Promise<Page<VirtualAccount>> {
    const result = await this.transport.get<Record<string, unknown>>('/v1/virtual-accounts', options, options.signal);
    const data = Array.isArray(result.data) ? result.data as Record<string, unknown>[] : [];
    return { ...result, data: data.map(virtualAccountFromApi), hasMore: Boolean(result.has_more), nextCursor: (result.next_cursor as string | null | undefined) ?? null, ...(result.total === undefined ? {} : { total: Number(result.total) }) };
  }

  async deactivate(id: string, options: RequestOptions = {}): Promise<VirtualAccount> {
    return virtualAccountFromApi(await this.transport.post(`/v1/virtual-accounts/${encodeURIComponent(id)}/deactivate`, {}, options));
  }
}

function virtualAccountFromApi(raw: Record<string, unknown>): VirtualAccount {
  return {
    ...raw, id: String(raw.id), customerEmail: String(raw.customer_email), customerName: String(raw.customer_name),
    accountNumber: String(raw.account_number), accountName: String(raw.account_name), bankName: String(raw.bank_name),
    currency: String(raw.currency), provider: String(raw.provider), active: Boolean(raw.active),
    metadata: (raw.metadata as Record<string, string> | null | undefined) ?? null,
    createdAt: raw.created_at as string | undefined, updatedAt: raw.updated_at as string | undefined,
  };
}
