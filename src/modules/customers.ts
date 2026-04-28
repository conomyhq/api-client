import type { Customer, CustomerId } from '@conomyhq/core';
import type { Transport } from '../transport';

/**
 * Customers resource. Every endpoint requires `clientId` as a query
 * param — the gateway uses it to scope the customer to a tenant. The
 * nested `documents` sub-module groups the KYC document lifecycle
 * (presign → upload → approve / reject) so call sites read like the
 * domain: `api.customers.documents.approve(...)`.
 *
 * `ListCustomersResponse` is not exported by `@conomyhq/core` yet, so
 * we declare the shape locally to keep the module self-contained.
 */
export interface ListCustomersResponse {
  count: number;
  customers: Customer[];
}

export interface ListCustomersOptions {
  documentNumber?: string;
  email?: string;
  operationLevel?: string;
  count?: number;
  offset?: number;
}

export class CustomerDocumentsModule {
  constructor(private readonly transport: Transport) {}

  presign(
    customerId: CustomerId,
    clientId: string,
    input: unknown,
  ): Promise<unknown> {
    return this.transport.request<unknown>(
      `/customers/${encodeURIComponent(customerId)}/documents/presign`,
      { method: 'POST', query: { clientId }, body: input },
    );
  }

  upload(
    customerId: CustomerId,
    clientId: string,
    input: unknown,
  ): Promise<unknown> {
    return this.transport.request<unknown>(
      `/customers/${encodeURIComponent(customerId)}/documents`,
      { method: 'POST', query: { clientId }, body: input },
    );
  }

  approve(
    customerId: CustomerId,
    idx: number,
    clientId: string,
  ): Promise<Customer> {
    return this.transport.request<Customer>(
      `/customers/${encodeURIComponent(customerId)}/documents/${idx}/approve`,
      { method: 'POST', query: { clientId }, body: {} },
    );
  }

  reject(
    customerId: CustomerId,
    idx: number,
    clientId: string,
    reason: string,
  ): Promise<Customer> {
    return this.transport.request<Customer>(
      `/customers/${encodeURIComponent(customerId)}/documents/${idx}/reject`,
      { method: 'POST', query: { clientId }, body: { reason } },
    );
  }
}

export class CustomersModule {
  readonly documents: CustomerDocumentsModule;

  constructor(private readonly transport: Transport) {
    this.documents = new CustomerDocumentsModule(transport);
  }

  list(
    clientId: string,
    opts: ListCustomersOptions = {},
  ): Promise<ListCustomersResponse> {
    return this.transport.request<ListCustomersResponse>('/customers', {
      query: { clientId, ...opts } as unknown as Record<string, never>,
    });
  }

  get(id: CustomerId, clientId: string): Promise<Customer> {
    return this.transport.request<Customer>(
      `/customers/${encodeURIComponent(id)}`,
      { query: { clientId } },
    );
  }

  create(
    clientId: string,
    input: unknown,
  ): Promise<Customer> {
    return this.transport.request<Customer>('/customers', {
      method: 'POST',
      query: { clientId },
      body: input,
    });
  }

  update(
    id: CustomerId,
    clientId: string,
    input: unknown,
  ): Promise<Customer> {
    return this.transport.request<Customer>(
      `/customers/${encodeURIComponent(id)}`,
      { method: 'PATCH', query: { clientId }, body: input },
    );
  }
}
