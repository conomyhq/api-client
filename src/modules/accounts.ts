import type {
  Account,
  AccountId,
  PaginatedResponse,
} from '@conomyhq/types';
import type { Transport } from '../transport';

/**
 * Accounts resource. Mirrors the gateway contract surfaced by the
 * wallet repository (`ConomyAccountRepository`): a paginated `list`
 * over `/accounts/v2`, plus the legacy `/accounts` lookups by number
 * or `(identityId, ESCROW, currency)` used by withdrawal flows. The
 * `update` and `create` paths target the canonical resource URL.
 */
export interface ListAccountsOptions {
  identityId: string;
  limit?: number;
  offset?: number;
  sort?: string;
  type?: string;
  currency?: string;
}

export interface GetEscrowOptions {
  identityId: string;
  currency: string;
}

export class AccountsModule {
  constructor(private readonly transport: Transport) {}

  list(opts: ListAccountsOptions): Promise<PaginatedResponse<Account>> {
    return this.transport.request<PaginatedResponse<Account>>('/accounts/v2', {
      query: opts as unknown as Record<string, never>,
    });
  }

  getByNumber(accountNumber: string): Promise<Account[]> {
    return this.transport.request<Account[]>('/accounts', {
      query: { accountNumber },
    });
  }

  getEscrow(opts: GetEscrowOptions): Promise<Account[]> {
    return this.transport.request<Account[]>('/accounts', {
      query: {
        identityId: opts.identityId,
        type: 'ESCROW',
        currency: opts.currency,
      },
    });
  }

  update(id: AccountId, input: Record<string, unknown>): Promise<Account> {
    return this.transport.request<Account>(`/accounts/${id}`, {
      method: 'PATCH',
      body: input,
    });
  }

  create(input: Record<string, unknown>): Promise<Account> {
    return this.transport.request<Account>('/accounts', {
      method: 'POST',
      body: input,
    });
  }
}
