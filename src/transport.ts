import {
  classifyHttpError,
  NetworkError,
  type ApiError,
  type ApiErrorBody,
} from '@conomyhq/types/errors';

/**
 * Configuration accepted by `createApiClient`. Everything is injected
 * by the caller so the package stays runtime-agnostic — Auth0
 * server-side, in-memory token, mocked fetch for tests, all work.
 */
export interface ApiClientConfig {
  /** API gateway base URL — e.g. `https://api.conomyhq.com/sandbox`. */
  baseUrl: string;
  /**
   * Returns the access token to send as `Authorization: Bearer …`.
   * Called once per request — implementations are free to refresh
   * silently. Return `null` for unauthenticated calls (rare; e.g. the
   * Coinbase FX endpoint).
   */
  getAccessToken: () => Promise<string | null> | string | null;
  /**
   * Optional API key forwarded as `x-api-key`. Some gateway
   * deployments require it in addition to the Bearer token.
   */
  apiKey?: string;
  /**
   * Hook invoked when the gateway returns 401 — apps usually wire it
   * to a session-clear / redirect-to-login path.
   */
  onUnauthorized?: () => void;
  /**
   * Global error hook — called for every thrown ApiError, AFTER it is
   * thrown. Use for telemetry; do not throw from here.
   */
  onError?: (error: ApiError) => void;
  /**
   * Override the runtime `fetch`. Defaults to `globalThis.fetch`
   * which exists in Node 18+, all browsers, and React Native.
   */
  fetch?: typeof globalThis.fetch;
  /**
   * Default request timeout in ms. Per-request overrides take
   * precedence. `null` disables the timeout.
   */
  timeoutMs?: number | null;
  /**
   * Default `User-Agent` to forward. The browser locks this value, so
   * it only applies on Node consumers (BFFs).
   */
  userAgent?: string;
}

export interface RequestOptions {
  /** HTTP method. Default: 'GET'. */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON body — stringified automatically. */
  body?: unknown;
  /** Query params — `null` / `undefined` values are dropped. */
  query?: Record<string, string | number | boolean | null | undefined | string[]>;
  /** Skip the Bearer header (for the rare unauthenticated endpoint). */
  skipAuth?: boolean;
  /** AbortSignal forwarded to fetch. */
  signal?: AbortSignal;
  /** Per-request timeout override. */
  timeoutMs?: number | null;
  /** Extra headers (Content-Type / Accept / Authorization are owned by the client). */
  headers?: Record<string, string>;
}

function buildQueryString(query: RequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, String(v));
    } else {
      params.append(key, String(value));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

async function readErrorBody(res: Response): Promise<ApiErrorBody> {
  const contentType = res.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      return (await res.json()) as ApiErrorBody;
    }
    const text = await res.text();
    return text || undefined;
  } catch {
    return undefined;
  }
}

function extractErrorMessage(body: ApiErrorBody, fallback: string): string {
  if (typeof body === 'string' && body.length > 0) return body;
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (typeof b.message === 'string') return b.message;
    if (typeof b.error === 'string') return b.error;
  }
  return fallback;
}

/**
 * Internal `Transport` — the primitive every domain module is built
 * on. The public `createApiClient` exposes a typed surface; this
 * function does the actual wire work.
 */
export class Transport {
  constructor(private readonly config: ApiClientConfig) {}

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const fetchImpl = this.config.fetch ?? globalThis.fetch;
    const url = `${this.config.baseUrl}${path}${buildQueryString(opts.query)}`;
    const method = opts.method ?? 'GET';

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(opts.headers ?? {}),
    };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.config.apiKey) headers['x-api-key'] = this.config.apiKey;
    if (this.config.userAgent) headers['User-Agent'] = this.config.userAgent;

    if (!opts.skipAuth) {
      const token = await this.config.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    // Timeout via AbortController. Caller's signal wins if both fire.
    const timeoutMs = opts.timeoutMs ?? this.config.timeoutMs ?? null;
    const controller = new AbortController();
    const externalSignalCleanup = opts.signal?.addEventListener
      ? (() => {
          opts.signal!.addEventListener('abort', () => controller.abort());
          return () => {};
        })()
      : null;
    const timer =
      timeoutMs != null
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;

    let res: Response;
    try {
      res = await fetchImpl(url, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
    } catch (cause) {
      const err = new NetworkError(
        cause instanceof Error ? cause.message : 'Network request failed',
        { body: undefined, cause },
      );
      this.config.onError?.(err);
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
      externalSignalCleanup?.();
    }

    if (!res.ok) {
      const body = await readErrorBody(res);
      const message = extractErrorMessage(body, `HTTP ${res.status}`);
      const err = classifyHttpError(res.status, message, body);
      if (res.status === 401) this.config.onUnauthorized?.();
      this.config.onError?.(err);
      throw err;
    }

    // 204 No Content — no body to parse.
    if (res.status === 204) return undefined as T;

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }
}
