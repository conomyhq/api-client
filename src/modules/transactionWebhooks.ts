import type {
  TransactionWebhookFilters,
  TransactionWebhookListResponse,
} from '@conomyhq/core';
import type { Transport } from '../transport';

/**
 * Transaction webhooks composition. Operations forwards the listing
 * to checkout's /transaction-webhooks; the api-client just calls
 * operations and returns the same shape.
 */

export class TransactionWebhooksModule {
  constructor(private readonly transport: Transport) {}

  list(
    filters: TransactionWebhookFilters = {},
  ): Promise<TransactionWebhookListResponse> {
    return this.transport.request<TransactionWebhookListResponse>(
      '/transaction-webhooks',
      { query: filters as Record<string, never> },
    );
  }
}
