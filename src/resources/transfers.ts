import { ConfigurationError } from '../errors.js';
import { requireIdempotencyKey } from './payments.js';
import type { Bank, BulkTransfer, InitiateBulkTransferInput, InitiateTransferInput, Page, RequestOptions, Transfer, TransferListOptions, VerifiedAccount, VerifyAccountInput } from '../types.js';
import type { Transport } from '../transport.js';

export class TransfersResource {
  constructor(private readonly transport: Transport) {}

  async listBanks(currency = 'NGN', providerId?: string, options: RequestOptions = {}): Promise<{ banks: Bank[] }> {
    assertCurrency(currency);
    const result = await this.transport.get<Record<string, unknown>>('/v1/transfers/banks', { currency, provider_id: providerId }, options.signal);
    const banks = Array.isArray(result.banks) ? result.banks as Record<string, unknown>[] : [];
    return { ...result, banks: banks.map(bankFromApi) };
  }

  async verifyAccount(input: VerifyAccountInput, options: RequestOptions = {}): Promise<VerifiedAccount> {
    assertAccount(input.accountNumber, input.bankCode);
    const result = await this.transport.post<Record<string, unknown>>('/v1/transfers/verify-account', {
      account_number: input.accountNumber, bank_code: input.bankCode, provider_id: input.providerId,
    }, options);
    return {
      ...result,
      accountName: String(result.account_name ?? result.accountName),
      accountNumber: String(result.account_number ?? result.accountNumber),
      bankCode: String(result.bank_code ?? result.bankCode),
    };
  }

  async initiate(input: InitiateTransferInput, options: RequestOptions): Promise<Transfer> {
    requireIdempotencyKey(options, 'transfers.initiate');
    validateTransfer(input);
    return transferFromApi(await this.transport.post<Record<string, unknown>>('/v1/transfers', transferBody(input), options));
  }

  async initiateBulk(input: InitiateBulkTransferInput, options: RequestOptions): Promise<BulkTransfer> {
    requireIdempotencyKey(options, 'transfers.initiateBulk');
    assertCurrency(input.currency);
    if (!Array.isArray(input.transfers) || input.transfers.length === 0) throw new ConfigurationError('bulk transfer requires at least one transfer', 'ConfigurationError');
    input.transfers.forEach((transfer) => validateTransfer({ ...transfer, currency: input.currency }));
    const result = await this.transport.post<Record<string, unknown>>('/v1/transfers/bulk', {
      currency: input.currency, provider_id: input.providerId, transfers: input.transfers.map(transferBody),
    }, options);
    return {
      ...result,
      batchReference: String(result.batch_reference ?? result.batchReference),
      status: result.status as BulkTransfer['status'], totalCount: Number(result.total_count ?? result.totalCount),
      successCount: numberOrUndefined(result.success_count ?? result.successCount),
      failureCount: numberOrUndefined(result.failure_count ?? result.failureCount),
    };
  }

  async get(id: string, options: RequestOptions = {}): Promise<Transfer> {
    return transferFromApi(await this.transport.get(`/v1/transfers/${encodeURIComponent(id)}`, undefined, options.signal));
  }

  async list(options: TransferListOptions = {}): Promise<Page<Transfer>> {
    const result = await this.transport.get<Record<string, unknown>>('/v1/transfers', options, options.signal);
    const data = Array.isArray(result.data) ? result.data as Record<string, unknown>[] : [];
    return { ...result, data: data.map(transferFromApi), hasMore: Boolean(result.has_more), nextCursor: (result.next_cursor as string | null | undefined) ?? null, ...(result.total === undefined ? {} : { total: Number(result.total) }) };
  }
}

function transferBody(input: InitiateTransferInput | { amount: number; reference: string; recipient: InitiateTransferInput['recipient']; reason?: string }) {
  return {
    amount: input.amount, reference: input.reference,
    recipient: { account_number: input.recipient.accountNumber, bank_code: input.recipient.bankCode, name: input.recipient.name }, reason: input.reason,
    ...('currency' in input ? { currency: input.currency, provider_id: input.providerId, metadata: input.metadata } : {}),
  };
}

function transferFromApi(raw: Record<string, unknown>): Transfer {
  const recipient = raw.recipient as Record<string, unknown> | undefined;
  return {
    ...raw, id: String(raw.id), reference: String(raw.reference), amount: Number(raw.amount), currency: String(raw.currency), status: raw.status as Transfer['status'],
    provider: (raw.provider as string | null | undefined) ?? null, providerTransferCode: (raw.provider_transfer_code ?? raw.providerTransferCode) as string | null | undefined,
    pendingConfirmation: Boolean(raw.pending_confirmation),
    recipient: recipient ? { accountNumber: String(recipient.account_number ?? recipient.accountNumber), bankCode: String(recipient.bank_code ?? recipient.bankCode), name: String(recipient.name) } : undefined,
    reason: (raw.reason as string | null | undefined) ?? null, failureReason: (raw.failure_reason as string | null | undefined) ?? null,
    metadata: (raw.metadata as Record<string, string> | null | undefined) ?? null, createdAt: raw.created_at as string | undefined, updatedAt: raw.updated_at as string | undefined,
  };
}

function bankFromApi(raw: Record<string, unknown>): Bank { return { ...raw, name: String(raw.name), code: String(raw.code) }; }
function validateTransfer(input: InitiateTransferInput): void {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new ConfigurationError('transfer amount must be a positive integer in minor units', 'ConfigurationError');
  assertCurrency(input.currency);
  if (!/^[a-zA-Z0-9_-]{1,255}$/.test(input.reference)) throw new ConfigurationError('transfer reference must contain only letters, numbers, underscores, or hyphens', 'ConfigurationError');
  assertAccount(input.recipient.accountNumber, input.recipient.bankCode);
  if (!input.recipient.name.trim()) throw new ConfigurationError('transfer recipient name is required', 'ConfigurationError');
}
function assertCurrency(currency: string): void { if (!/^[A-Z]{3}$/.test(currency)) throw new ConfigurationError('currency must be a three-letter uppercase ISO code', 'ConfigurationError'); }
function assertAccount(accountNumber: string, bankCode: string): void { if (!accountNumber.trim() || !bankCode.trim()) throw new ConfigurationError('accountNumber and bankCode are required', 'ConfigurationError'); }
function numberOrUndefined(value: unknown): number | undefined { return value === undefined || value === null ? undefined : Number(value); }
