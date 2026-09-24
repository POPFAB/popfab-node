import { ConfigurationError, NetworkError, createApiError } from './errors.js';
import type { PopfabConfig, PopfabEnvironment, RequestOptions } from './types.js';

export class Transport {
  private readonly fetcher: typeof fetch;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxReadRetries: number;
  readonly environment: PopfabEnvironment;

  constructor(private readonly config: PopfabConfig) {
    if (!/^sk_(test|live)_/.test(config.apiKey)) {
      throw new ConfigurationError('apiKey must start with sk_test_ or sk_live_', 'ConfigurationError');
    }
    this.environment = config.apiKey.startsWith('sk_live_') ? 'live' : 'sandbox';
    this.fetcher = config.fetch ?? globalThis.fetch;
    if (!this.fetcher) throw new ConfigurationError('A Fetch implementation is required', 'ConfigurationError');
    this.baseUrl = (config.baseUrl ?? 'https://api.popfab.com').replace(/\/$/, '');
    this.timeout = config.timeout ?? 15_000;
    this.maxReadRetries = config.maxReadRetries ?? 2;
  }

  async get<T>(path: string, query?: object, signal?: AbortSignal): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && key !== 'signal') url.searchParams.set(key, String(value));
    }
    return this.request<T>('GET', url.toString(), undefined, { signal }, this.maxReadRetries);
  }

  async post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', `${this.baseUrl}${path}`, body, options, 0);
  }

  private async request<T>(method: string, url: string, body: unknown, options: RequestOptions, retries: number): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);
      const onAbort = () => controller.abort();
      options.signal?.addEventListener('abort', onAbort, { once: true });
      try {
        const response = await this.fetcher(url, {
          method,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            Accept: 'application/json',
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
            'User-Agent': 'popfab-node/0.1.0',
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const responseBody = await response.json().catch(() => null);
        const requestId = response.headers.get('x-request-id') ?? undefined;
        if (!response.ok) {
          const retryAfter = Number(response.headers.get('retry-after')) || undefined;
          throw createApiError(response.status, responseBody, requestId, retryAfter);
        }
        return responseBody as T;
      } catch (error) {
        lastError = error;
        if (error instanceof Error && error.name.endsWith('Error') && 'statusCode' in error) throw error;
        if (attempt === retries) break;
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', onAbort);
      }
    }
    throw new NetworkError('Could not complete Popfab API request', 'NetworkError', undefined, undefined, undefined, undefined, { cause: lastError });
  }
}
