import type {
  PaginatedResponse,
  Payment,
  PaymentCurrencies,
  PaymentId,
  PaymentOrigin,
  PaymentStatus,
  PaymentType,
  WithdrawalProductBounds,
} from '@conomyhq/core';
import {
  getWithdrawalProductBoundsFromAvailableProducts,
  type AvailablePaymentProductsResponse,
} from '@conomyhq/core/domains/payments';
import type { Transport } from '../transport';

/**
 * Payments resource. Method names follow REST verbs (`list`, `get`,
 * `create`, `capture`) so call sites read like English. Pagination,
 * filtering and sorting params line up 1:1 with the gateway contract;
 * see the inventory in `/Users/felipegarcia/conomy/conomy-api-client/
 * docs/endpoints.md` for the full table.
 */
export interface ListPaymentsOptions {
  identityId?: string;
  accountNumber?: string;
  type?: PaymentType;
  status?: PaymentStatus[];
  startDate?: string;
  endDate?: string;
  paymentLinkId?: string;
  currency?: string;
  limit?: number;
  offset?: number;
  sort?: string;
}

function toPaymentQuery(
  opts: ListPaymentsOptions,
): Record<string, string | number | boolean | undefined> {
  return {
    identityId: opts.identityId,
    accountNumber: opts.accountNumber,
    type: opts.type,
    status: opts.status?.join(','),
    startDate: opts.startDate,
    endDate: opts.endDate,
    paymentLinkId: opts.paymentLinkId,
    currency: opts.currency,
    limit: opts.limit,
    offset: opts.offset,
    sort: opts.sort,
  };
}

export class PaymentsModule {
  constructor(private readonly transport: Transport) {}

  list(opts: ListPaymentsOptions = {}): Promise<PaginatedResponse<Payment>> {
    return this.transport.request<PaginatedResponse<Payment>>('/payments', {
      query: toPaymentQuery(opts),
    });
  }

  get(id: PaymentId): Promise<Payment> {
    return this.transport.request<Payment>(`/payments/${id}`);
  }

  create(input: unknown): Promise<Payment> {
    return this.transport.request<Payment>('/payments', {
      method: 'POST',
      body: input,
    });
  }

  createWithdrawal(input: unknown): Promise<Payment> {
    return this.create(input);
  }

  createP2P(input: unknown): Promise<Payment> {
    return this.create(input);
  }

  capture(id: PaymentId): Promise<Payment> {
    return this.transport.request<Payment>(`/payments/${id}/captured`, {
      method: 'POST',
      body: {},
    });
  }

  origins(accountNumber?: string): Promise<PaymentOrigin[]> {
    return this.transport.request<PaymentOrigin[]>('/payment-origins', {
      query: { accountNumber: accountNumber ?? '' },
    });
  }

  currencies(identityId: string): Promise<PaymentCurrencies> {
    return this.transport.request<PaymentCurrencies>('/payments/currencies', {
      query: { identityId },
    });
  }

  banks(country: string): Promise<unknown[]> {
    return this.transport
      .request<unknown>(`/payments/banks/${encodeURIComponent(country)}`)
      .then((data) => (Array.isArray(data) ? data : [data]));
  }

  availableProducts(
    identityId: string,
    currency: string,
  ): Promise<AvailablePaymentProductsResponse> {
    return this.transport.request<AvailablePaymentProductsResponse>(
      '/payments/available-products',
      { query: { identityId, currency } },
    );
  }

  async getWithdrawalProductBounds(
    identityId: string,
    currency: string,
  ): Promise<WithdrawalProductBounds> {
    const products = await this.availableProducts(identityId, currency);
    return getWithdrawalProductBoundsFromAvailableProducts(products, currency);
  }
}
