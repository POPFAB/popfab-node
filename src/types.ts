export type PopfabEnvironment = 'sandbox' | 'live';
export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'reversed';
export type TransferStatus = PaymentStatus | 'queued';

export interface RequestOptions {
  /** Required for every operation that can move money. Persist this value before sending the request. */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface ListOptions {
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}

export interface CustomerInput {
  email: string;
  name?: string;
  phone?: string;
  country?: string;
  region?: string;
}

export type PaymentMethod = 'card' | 'bank_transfer' | 'ussd' | 'mobile_money' | 'qr';

export interface InitiatePaymentInput {
  amount: number;
  currency: string;
  reference: string;
  paymentMethod: PaymentMethod;
  customer: CustomerInput;
  callbackUrl?: string;
  metadata?: Record<string, string>;
  routingOverride?: string;
}

export interface Payment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider?: string | null;
  providerReference?: string | null;
  checkoutUrl?: string | null;
  pendingConfirmation?: boolean;
  paymentMethod?: PaymentMethod;
  amountMinor?: number;
  amountMinorUnit?: string;
  failureReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface RefundInput {
  amount?: number;
  reason?: string;
}

export interface SyncOptions extends RequestOptions {
  force?: boolean;
}

export interface PaymentListOptions extends ListOptions {
  status?: PaymentStatus;
  provider?: string;
}

export interface RecipientInput {
  accountNumber: string;
  bankCode: string;
  name: string;
}

export interface TransferRecipient {
  accountNumber: string;
  bankCode: string;
  name: string;
}

export interface VerifyAccountInput {
  accountNumber: string;
  bankCode: string;
  providerId?: string;
}

export interface VerifiedAccount {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  [key: string]: unknown;
}

export interface InitiateTransferInput {
  amount: number;
  currency: string;
  reference: string;
  recipient: RecipientInput;
  reason?: string;
  providerId?: string;
  metadata?: Record<string, string>;
}

export interface BulkTransferItemInput {
  amount: number;
  reference: string;
  recipient: RecipientInput;
  reason?: string;
}

export interface InitiateBulkTransferInput {
  currency: string;
  providerId?: string;
  transfers: BulkTransferItemInput[];
}

export type BulkTransferStatus = 'queued' | 'processing' | 'partial' | 'completed' | 'failed';

export interface BulkTransfer {
  batchReference: string;
  status: BulkTransferStatus;
  totalCount: number;
  successCount?: number;
  failureCount?: number;
  [key: string]: unknown;
}

export interface Transfer {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: TransferStatus;
  provider?: string | null;
  providerTransferCode?: string | null;
  recipient?: TransferRecipient;
  reason?: string | null;
  failureReason?: string | null;
  metadata?: Record<string, string> | null;
  createdAt?: string;
  updatedAt?: string;
  pendingConfirmation?: boolean;
  [key: string]: unknown;
}

export interface TransferListOptions extends ListOptions {
  status?: TransferStatus;
}

export interface Bank {
  name: string;
  code: string;
  [key: string]: unknown;
}

export interface Page<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
  total?: number;
  [key: string]: unknown;
}

export interface PopfabConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  /** Maximum automatic retries for safe GET requests only. Defaults to 2. */
  maxReadRetries?: number;
  fetch?: typeof fetch;
}

export interface WebhookEvent {
  id: string;
  type: string;
  apiVersion: string;
  createdAt: string;
  data: Record<string, unknown>;
}

export interface ConstructWebhookEventInput {
  /** Exact raw request bytes; never pass a re-serialized JSON object. */
  payload: string | Uint8Array;
  signature: string | undefined;
  timestamp: string | number | undefined;
  webhookSecret: string;
  /** Maximum permitted timestamp skew in seconds. Defaults to 300. */
  toleranceSeconds?: number;
  /** Test-only clock override in Unix milliseconds. */
  now?: number;
}
