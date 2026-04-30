import type {
  CreateOperationsReportRequest,
  OperationsReportRun,
} from '@conomyhq/core';
import { q, type Transport } from '../transport';

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

  /** Operations returns `{rows, next}` today (mirrors the cases /
   *  treasury list pattern). The conomyhq-types
   *  `ListOperationsReportsResponse` uses `{count, runs, nextCursor}`
   *  for the dashboard's older shape — we expose the wire shape
   *  operations actually emits and let callers map if they need the
   *  paginated form. */
  list(
    opts: ListReportsOptions = {},
  ): Promise<{ rows: OperationsReportRun[]; next?: string }> {
    return this.transport.request<{ rows: OperationsReportRun[]; next?: string }>('/reports', {
      query: q(opts),
    });
  }

  get(id: string): Promise<OperationsReportRun> {
    return this.transport.request<OperationsReportRun>(
      `/reports/${encodeURIComponent(id)}`,
    );
  }
}
