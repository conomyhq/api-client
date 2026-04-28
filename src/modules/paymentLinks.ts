import type {
  PaginatedResponse,
  PaymentLink,
  PaymentLinkId,
  PaymentLinkStatus,
} from '@conomyhq/core';
import type { Transport } from '../transport';

/**
 * Payment Links resource. The gateway uses dotted query keys
 * (`customer.email`, `destination.accountNumber`, `owner.identityId`)
 * — we accept flat options on the SDK surface and translate at the
 * boundary so call sites stay readable.
 *
 * The `PaymentLink` entity is owned by `@conomyhq/core`; this module
 * only models gateway operations.
 */
export interface ListPaymentLinksOptions {
  customerEmail?: string;
  destinationAccountNumber?: string;
  id?: string;
  limit?: number;
  next?: number;
  offset?: number;
  ownerIdentityId?: string;
  status?: PaymentLinkStatus | string;
  startDate?: string;
  endDate?: string;
  currency?: string;
  sort?: string;
}

function toQuery(
  opts: ListPaymentLinksOptions,
): Record<string, string | number | boolean | undefined> {
  return {
    sort: opts.sort ?? 'createdAt:desc',
    'customer.email': opts.customerEmail,
    'destination.accountNumber': opts.destinationAccountNumber,
    id: opts.id,
    limit: opts.limit,
    next: opts.next,
    offset: opts.offset,
    'owner.identityId': opts.ownerIdentityId,
    status: opts.status,
    startDate: opts.startDate,
    endDate: opts.endDate,
    currency: opts.currency,
  };
}

export class PaymentLinksModule {
  constructor(private readonly transport: Transport) {}

  list(
    opts: ListPaymentLinksOptions = {},
  ): Promise<PaginatedResponse<PaymentLink>> {
    return this.transport.request<PaginatedResponse<PaymentLink>>(
      '/payment-links',
      { query: toQuery(opts) },
    );
  }

  get(id: PaymentLinkId): Promise<PaymentLink> {
    return this.transport.request<PaymentLink>(
      `/payment-links/${encodeURIComponent(id)}`,
    );
  }

  create(input: unknown): Promise<PaymentLink> {
    return this.transport.request<PaymentLink>('/payment-links', {
      method: 'POST',
      body: input,
    });
  }

  update(
    id: PaymentLinkId,
    input: unknown,
  ): Promise<PaymentLink> {
    return this.transport.request<PaymentLink>(
      `/payment-links/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: input },
    );
  }

  activate(id: PaymentLinkId): Promise<PaymentLink> {
    return this.transport.request<PaymentLink>(
      `/payment-links/${encodeURIComponent(id)}/activate`,
      { method: 'POST', body: {} },
    );
  }
}
