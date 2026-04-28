import type {
  PaginatedResponse,
  Payment,
  PaymentId,
  PaymentStatus,
  PaymentType,
} from '@conomyhq/types';
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

export class PaymentsModule {
  constructor(private readonly transport: Transport) {}

  list(opts: ListPaymentsOptions = {}): Promise<PaginatedResponse<Payment>> {
    return this.transport.request<PaginatedResponse<Payment>>('/payments', {
      query: opts as Record<string, never>, // narrows to the transport's query shape
    });
  }

  get(id: PaymentId): Promise<Payment> {
    return this.transport.request<Payment>(`/payments/${id}`);
  }

  create(input: Record<string, unknown>): Promise<Payment> {
    return this.transport.request<Payment>('/payments', {
      method: 'POST',
      body: input,
    });
  }

  capture(id: PaymentId): Promise<Payment> {
    return this.transport.request<Payment>(`/payments/${id}/captured`, {
      method: 'POST',
      body: {},
    });
  }
}
