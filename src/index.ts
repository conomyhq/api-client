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
 * Errors are typed via `@conomyhq/core/errors` — every thrown value is
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
import { AccountsModule } from './modules/accounts';
import { CustomersModule } from './modules/customers';
import { IdentitiesModule } from './modules/identities';
import { PaymentLinksModule } from './modules/paymentLinks';
import { FxModule } from './modules/fx';
import { GeoDistributionModule } from './modules/geoDistribution';
import { ClientsModule } from './modules/clients';
import { OnboardingModule } from './modules/onboarding';
import { CasesModule } from './modules/cases';
import { TreasuryModule } from './modules/treasury';
import { ReportsModule } from './modules/reports';
import { TransactionWebhooksModule } from './modules/transactionWebhooks';

export interface ApiClient {
  payments: PaymentsModule;
  accounts: AccountsModule;
  customers: CustomersModule;
  identities: IdentitiesModule;
  paymentLinks: PaymentLinksModule;
  fx: FxModule;
  geoDistribution: GeoDistributionModule;
  /** Operator-side clients bootstrap (POST /clients/{id}/onboarding). */
  clients: ClientsModule;
  /** Onboarding applications (operator + prospect token-auth). */
  onboarding: OnboardingModule;
  /** Operator dashboard cases / tickets (F9). */
  cases: CasesModule;
  /** Treasury — balances, history, identityBalances, adjustments (F7). */
  treasury: TreasuryModule;
  /** Async CSV exports (F11). */
  reports: ReportsModule;
  /** Transaction webhook listing (composition with checkout). */
  transactionWebhooks: TransactionWebhooksModule;
  /** Escape hatch — direct access to the transport for endpoints not yet
   *  modeled by a typed module. Prefer module methods when available. */
  transport: Transport;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const transport = new Transport(config);
  return {
    payments: new PaymentsModule(transport),
    accounts: new AccountsModule(transport),
    customers: new CustomersModule(transport),
    identities: new IdentitiesModule(transport),
    paymentLinks: new PaymentLinksModule(transport),
    fx: new FxModule(transport),
    geoDistribution: new GeoDistributionModule(transport),
    clients: new ClientsModule(transport),
    onboarding: new OnboardingModule(transport),
    cases: new CasesModule(transport),
    treasury: new TreasuryModule(transport),
    reports: new ReportsModule(transport),
    transactionWebhooks: new TransactionWebhooksModule(transport),
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
} from '@conomyhq/core/errors';
