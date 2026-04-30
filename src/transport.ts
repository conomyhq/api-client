import {
  classifyHttpError,
  NetworkError,
  type ApiError,
  type ApiErrorBody,
} from '@conomyhq/core/errors';

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

/**
 * Acceptable values for a single query-string entry. We intentionally
 * accept any non-object scalar plus arrays of scalars — `buildQueryString`
 * normalizes via `String(value)`. The previous narrow union forced
 * every module to cast its option object to `Record<string, never>`,
 * which silently disabled type-checking on query params; a single
 * resource-shaped option object now satisfies the contract directly.
 */
export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlyArray<string | number | boolean>;

/**
 * Loose query-string shape — any string-keyed bag of QueryValues.
 *
 * NOTE: TypeScript does not add an implicit index signature to
 * declared interfaces, so passing an interface-shaped option object
 * (e.g. `TreasuryHistoryQuery`) requires a one-line cast to
 * `QueryParams`. The cast is honest (the value type is exactly
 * `QueryValue`); the previous `Record<string, never>` form was the
 * misleading version that lied about the shape having no keys.
 */
export type QueryParams = Record<string, QueryValue>;

export interface RequestOptions {
  /** HTTP method. Default: 'GET'. */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON body — stringified automatically. */
  body?: unknown;
  /** Query params — `null` / `undefined` values are dropped. */
  query?: QueryParams;
  /** Skip the Bearer header (for the rare unauthenticated endpoint). */
  skipAuth?: boolean;
  /** AbortSignal forwarded to fetch. */
  signal?: AbortSignal;
  /** Per-request timeout override. */
  timeoutMs?: number | null;
  /** Extra headers (Content-Type / Accept / Authorization are owned by the client). */
  headers?: Record<string, string>;
}

/**
 * `q` is a tiny ergonomics helper for module call sites: it bridges a
 * resource-shaped option object to the loose QueryParams shape the
 * transport expects. TypeScript does not give declared interfaces an
 * implicit string index signature, so without this helper every
 * module needs an `as unknown as QueryParams` cast — `q(opts)` reads
 * cleaner.
 *
 * The runtime is unchanged: `buildQueryString` iterates entries,
 * drops null/undefined and stringifies the rest. The compile-time
 * surface stays correct because each module's own option type
 * documents exactly what's accepted before we hit `q`.
 *
 *   this.transport.request(url, { query: q(opts) })
 */
export function q(opts: object | undefined): QueryParams | undefined {
  return opts as QueryParams | undefined;
}

function buildQueryString(query: QueryParams | undefined): string {
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
