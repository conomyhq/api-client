/**
 * @conomyhq/api-client — typed HTTP client for the Conomy API Gateway.
 *
 * Single entry. The caller wires auth + base URL + (optional) telemetry
 * once, then calls typed resource modules:
 *
 *     import { createApiClient } from '@conomyhq/api-client';
 *
 *     const api = createApiClient({
 *       baseUrl: 'https://api.conomyhq.com/sandbox',
 *       getAccessToken: () => auth0.getAccessToken(),
 *       apiKey: process.env.CONOMY_API_KEY,
 *       onUnauthorized: () => router.push('/auth/logout'),
 *     });
 *
 *     const payments = await api.payments.list({ identityId, limit: 50 });
 *     const detail   = await api.payments.get(asPaymentId('abc'));
 *
 * Errors are typed via `@conomyhq/types/errors` — every thrown value is
 * an `ApiError` subclass, so callers can switch on `instanceof
 * NotFoundError`, `instanceof ValidationError`, etc.
 *
 * Modules are added incrementally. v0.1.0 ships `payments` as a
 * reference implementation; the remaining 7 (accounts, customers,
 * identities, paymentLinks, geoDistribution, fx, plus tenant) follow
 * the same pattern.
 */

export { Transport } from './transport';
export type { ApiClientConfig, RequestOptions } from './transport';

import type { ApiClientConfig } from './transport';
import { Transport } from './transport';
import { PaymentsModule } from './modules/payments';

export interface ApiClient {
  payments: PaymentsModule;
  /** Escape hatch — direct access to the transport for endpoints not yet
   *  modeled by a typed module. Prefer module methods when available. */
  transport: Transport;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const transport = new Transport(config);
  return {
    payments: new PaymentsModule(transport),
    transport,
  };
}

// Re-export the error hierarchy so consumers don't need a second import.
export {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  ServerError,
  NetworkError,
  classifyHttpError,
} from '@conomyhq/types/errors';
