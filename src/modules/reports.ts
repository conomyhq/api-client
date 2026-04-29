import type {
  CreateOperationsReportRequest,
  ListOperationsReportsResponse,
  OperationsReportRun,
} from '@conomyhq/core';
import type { Transport } from '../transport';

/**
 * Operations reports (F11) — async CSV exports. Today the handler runs
 * Process inline so small CSVs are DONE by the time `create` resolves.
 */

export interface ListReportsOptions {
  limit?: number;
  cursor?: string;
}

export class ReportsModule {
  constructor(private readonly transport: Transport) {}

  create(
    body: CreateOperationsReportRequest,
    idempotencyKey: string,
  ): Promise<OperationsReportRun> {
    return this.transport.request<OperationsReportRun>('/reports', {
      method: 'POST',
      body,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  list(
    opts: ListReportsOptions = {},
  ): Promise<ListOperationsReportsResponse | { rows: OperationsReportRun[]; next?: string }> {
    return this.transport.request('/reports', {
      query: opts as Record<string, never>,
    });
  }

  get(id: string): Promise<OperationsReportRun> {
    return this.transport.request<OperationsReportRun>(
      `/reports/${encodeURIComponent(id)}`,
    );
  }
}
