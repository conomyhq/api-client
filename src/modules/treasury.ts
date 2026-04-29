import type {
  TreasuryAdjustmentRequest,
  TreasuryBalance,
  TreasuryHistoryQuery,
  TreasuryHistoryRow,
  TreasuryIdentityBalancesResponse,
} from '@conomyhq/core';
import type { Transport } from '../transport';

/**
 * Treasury (F7) — balances + historical series + audited adjustments.
 * Operations composes against accounts gRPC; this api-client layer
 * only thins the HTTP contract.
 */

export interface IdentityBalancesQuery {
  clientId?: string;
  type?: 'CLIENT' | 'ORGANIZATION' | 'USER' | 'STAFF';
  limit?: number;
  cursor?: string;
}

export class TreasuryIdentitiesModule {
  constructor(private readonly transport: Transport) {}

  balance(identityId: string): Promise<TreasuryBalance> {
    return this.transport.request<TreasuryBalance>(
      `/treasury/identities/${encodeURIComponent(identityId)}/balance`,
    );
  }

  history(
    identityId: string,
    query: TreasuryHistoryQuery = {},
  ): Promise<{ rows: TreasuryHistoryRow[] }> {
    return this.transport.request<{ rows: TreasuryHistoryRow[] }>(
      `/treasury/identities/${encodeURIComponent(identityId)}/history`,
      { query: query as Record<string, never> },
    );
  }
}

export class TreasuryModule {
  readonly identities: TreasuryIdentitiesModule;

  constructor(private readonly transport: Transport) {
    this.identities = new TreasuryIdentitiesModule(transport);
  }

  identityBalances(
    query: IdentityBalancesQuery = {},
  ): Promise<TreasuryIdentityBalancesResponse> {
    return this.transport.request<TreasuryIdentityBalancesResponse>(
      '/treasury/identityBalances',
      { query: query as Record<string, never> },
    );
  }

  adjustment(
    body: TreasuryAdjustmentRequest,
    idempotencyKey: string,
  ): Promise<unknown> {
    return this.transport.request<unknown>('/treasury/adjustments', {
      method: 'POST',
      body,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }
}
