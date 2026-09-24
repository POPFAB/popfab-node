export interface ErrorDetails {
  field?: string;
  message: string;
}

export class PopfabError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly requestId?: string,
    public readonly details?: ErrorDetails[],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = type;
  }
}

export class AuthenticationError extends PopfabError {}
export class ValidationError extends PopfabError {}
export class IdempotencyError extends PopfabError {}
export class RateLimitError extends PopfabError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    type = 'RateLimitError',
    code?: string,
    statusCode?: number,
    requestId?: string,
    details?: ErrorDetails[],
  ) {
    super(message, type, code, statusCode, requestId, details);
  }
}
export class ApiError extends PopfabError {}
export class NetworkError extends PopfabError {}
export class ConfigurationError extends PopfabError {}

export function createApiError(status: number, body: unknown, requestId?: string, retryAfter?: number): PopfabError {
  const error = (body as { error?: { code?: string; message?: string; details?: ErrorDetails[] } })?.error;
  const message = error?.message ?? `Popfab API request failed with status ${status}`;
  const code = error?.code;
  const args = [message, 'ApiError', code, status, requestId, error?.details] as const;
  if (status === 401 || status === 403) return new AuthenticationError(message, 'AuthenticationError', code, status, requestId, error?.details);
  if (status === 400 || status === 422) return new ValidationError(message, 'ValidationError', code, status, requestId, error?.details);
  if (status === 409) return new IdempotencyError(message, 'IdempotencyError', code, status, requestId, error?.details);
  if (status === 429) return new RateLimitError(message, retryAfter, 'RateLimitError', code, status, requestId, error?.details);
  return new ApiError(...args);
}
