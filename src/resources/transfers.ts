import { requireIdempotencyKey } from './payments.js';
import type { Bank, InitiateTransferInput, ListOptions, Page, RequestOptions, Transfer, VerifiedAccount, VerifyAccountInput } from '../types.js';
import type { Transport } from '../transport.js';

export class TransfersResource {
  constructor(private readonly transport: Transport) {}

  listBanks(currency = 'NGN', providerId?: string, options: RequestOptions = {}): Promise<{ banks: Bank[] }> {
    return this.transport.get('/v1/transfers/banks', { currency, provider_id: providerId }, options.signal);
  }

  verifyAccount(input: VerifyAccountInput, options: RequestOptions = {}): Promise<VerifiedAccount> {
    return this.transport.post('/v1/transfers/verify-account', {
      account_number: input.accountNumber, bank_code: input.bankCode, provider_id: input.providerId,
    }, options);
  }

  initiate(input: InitiateTransferInput, options: RequestOptions): Promise<Transfer> {
    requireIdempotencyKey(options, 'transfers.initiate');
    return this.transport.post('/v1/transfers', {
      amount: input.amount, currency: input.currency, reference: input.reference,
      recipient: {
        account_number: input.recipient.accountNumber,
        bank_code: input.recipient.bankCode,
        name: input.recipient.name,
      },
      reason: input.reason, provider_id: input.providerId, metadata: input.metadata,
    }, options);
  }

  get(id: string, options: RequestOptions = {}): Promise<Transfer> {
    return this.transport.get(`/v1/transfers/${encodeURIComponent(id)}`, undefined, options.signal);
  }

  list(options: ListOptions & { status?: string; search?: string } = {}): Promise<Page<Transfer>> {
    return this.transport.get('/v1/transfers', options, options.signal);
  }
}
