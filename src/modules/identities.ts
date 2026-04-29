import type {
  Identity,
  IdentityId,
  IdentityType,
  PaginatedResponse,
  WithdrawalAccount,
} from '@conomyhq/core';
import type { Transport } from '../transport';

/**
 * Identities resource. Mirrors the gateway's `/identities` tree, plus
 * two nested sub-resources exposed as their own modules so callers can
 * discover capabilities by tab-completion:
 *
 *     api.identities.get(id)
 *     api.identities.permissions.create(id, scopes)
 *     api.identities.withdrawalAccounts.list(id)
 *
 * All "update*" verbs (`addBankAccount`, `updateUserInfo`,
 * `updateAddress`, …) hit the same `PATCH /identities/{id}` endpoint —
 * the gateway routes by payload shape. We keep them as distinct
 * methods so the BFF call sites stay self-documenting.
 */
export interface ListIdentitiesOptions {
  scopeIdentity?: string;
  parents?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  type?: IdentityType;
  email?: string;
  documentNumber?: string;
  phone?: string;
  status?: string;
}

export class IdentityPermissionsModule {
  constructor(private readonly transport: Transport) {}

  get(id: IdentityId): Promise<unknown> {
    return this.transport.request<unknown>(
      `/identities/${encodeURIComponent(id)}/permissions`,
    );
  }

  create(id: IdentityId, scopes: unknown): Promise<void> {
    return this.transport.request<void>(
      `/identities/${encodeURIComponent(id)}/permissions`,
      { method: 'POST', body: scopes },
    );
  }

  delete(
    id: IdentityId,
    ref: string,
    resource = 'IDENTITY',
  ): Promise<void> {
    return this.transport.request<void>(
      `/identities/${encodeURIComponent(id)}/permissions/${encodeURIComponent(ref)}`,
      { method: 'DELETE', query: { resource } },
    );
  }
}

/**
 * Identity-scoped accounts operations. Today the only modeled call
 * is `escrowFee` — `POST /identities/{id}/accounts/escrow-fee` —
 * which idempotently ensures ESCROW + FEE accounts exist for the
 * given identity for each requested currency. Used by checkout's
 * getCurrencies flow when a new currency shows up for an identity.
 *
 * Path used to live at `/internal/identities/{id}/escrow-fee`; it
 * was moved here because the artifacts created are accounts (not
 * identities). Auth + body shape unchanged.
 */
export class IdentityAccountsModule {
  constructor(private readonly transport: Transport) {}

  /** Ensure ESCROW + FEE accounts exist for the given identity for
   *  each currency. Returns 204 No Content; the response is empty. */
  escrowFee(
    id: IdentityId,
    currencies: string[],
  ): Promise<void> {
    return this.transport.request<void>(
      `/identities/${encodeURIComponent(id)}/accounts/escrow-fee`,
      { method: 'POST', body: { currencies } },
    );
  }
}

export class IdentityWithdrawalAccountsModule {
  constructor(private readonly transport: Transport) {}

  list(id: IdentityId): Promise<WithdrawalAccount[]> {
    return this.transport
      .request<WithdrawalAccount[] | { withdrawalAccounts?: WithdrawalAccount[] }>(
        `/identities/${encodeURIComponent(id)}/withdrawal-accounts`,
      )
      .then((data) => (Array.isArray(data) ? data : data.withdrawalAccounts ?? []));
  }

  create(
    id: IdentityId,
    data: unknown,
  ): Promise<WithdrawalAccount> {
    return this.transport.request<WithdrawalAccount>(
      `/identities/${encodeURIComponent(id)}/withdrawal-accounts`,
      { method: 'POST', body: data },
    );
  }

  delete(id: IdentityId, accountId: string): Promise<void> {
    return this.transport.request<void>(
      `/identities/${encodeURIComponent(id)}/withdrawal-accounts/${encodeURIComponent(accountId)}`,
      { method: 'DELETE' },
    );
  }
}

export class IdentitiesModule {
  readonly permissions: IdentityPermissionsModule;
  readonly withdrawalAccounts: IdentityWithdrawalAccountsModule;
  readonly accounts: IdentityAccountsModule;

  constructor(private readonly transport: Transport) {
    this.permissions = new IdentityPermissionsModule(transport);
    this.withdrawalAccounts = new IdentityWithdrawalAccountsModule(transport);
    this.accounts = new IdentityAccountsModule(transport);
  }

  get(id: IdentityId): Promise<Identity> {
    return this.transport.request<Identity>(
      `/identities/${encodeURIComponent(id)}`,
    );
  }

  create(input: unknown): Promise<Identity> {
    return this.transport.request<Identity>('/identities', {
      method: 'POST',
      body: input,
    });
  }

  list(
    opts: ListIdentitiesOptions = {},
  ): Promise<PaginatedResponse<Identity>> {
    return this.transport.request<PaginatedResponse<Identity>>('/identities', {
      query: opts as Record<string, never>,
    });
  }

  update(id: IdentityId, input: unknown): Promise<Identity> {
    return this.transport.request<Identity>(
      `/identities/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: input },
    );
  }

  listParents(id: IdentityId): Promise<{ data: Identity[] }> {
    return this.transport.request<{ data: Identity[] }>(
      `/identities/parents/${encodeURIComponent(id)}`,
    );
  }

  // The next five all hit `PATCH /identities/{id}` — distinct names keep
  // the BFF call sites self-documenting (and let us add per-shape Zod
  // validation later without touching consumers).
  addBankAccount(
    id: IdentityId,
    data: unknown,
  ): Promise<Identity> {
    return this.update(id, data);
  }

  updateBankAccount(
    id: IdentityId,
    data: unknown,
  ): Promise<Identity> {
    return this.update(id, data);
  }

  updateUserInfo(
    id: IdentityId,
    data: unknown,
  ): Promise<Identity> {
    return this.update(id, data);
  }

  updateAddress(
    id: IdentityId,
    data: unknown,
  ): Promise<Identity> {
    return this.update(id, data);
  }

  deactivate(
    id: IdentityId,
    data: unknown,
  ): Promise<Identity> {
    return this.transport.request<Identity>(
      `/identities/${encodeURIComponent(id)}/deactivate`,
      { method: 'PATCH', body: data },
    );
  }

  reactivate(
    id: IdentityId,
    data: unknown,
  ): Promise<Identity> {
    return this.transport.request<Identity>(
      `/identities/${encodeURIComponent(id)}/reactivate`,
      { method: 'PATCH', body: data },
    );
  }

  addChildren(
    id: IdentityId,
    data: unknown,
  ): Promise<Identity> {
    return this.transport.request<Identity>(
      `/identities/${encodeURIComponent(id)}/children`,
      { method: 'POST', body: data },
    );
  }
}
