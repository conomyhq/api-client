import type {
  CaseAttachment,
  CaseAttachmentType,
  CaseRecord,
  CaseSeverity,
  CaseStatus,
  OperationsPresignedUpload,
  PaginatedResponse,
} from '@conomyhq/core';
import type { Transport } from '../transport';

/**
 * Cases (operator dashboard tickets, F9). The operations service is
 * the source of truth for cases — they are NOT mirrored from any
 * upstream service.
 */

export interface ListCasesOptions {
  status?: CaseStatus;
  severity?: CaseSeverity;
  assigneeId?: string;
  customerId?: string;
  paymentId?: string;
  clientId?: string;
  limit?: number;
  offset?: number;
}

export interface CreateCaseRequest {
  title: string;
  description: string;
  severity?: CaseSeverity;
  assigneeId?: string;
  customerId?: string;
  paymentId?: string;
  clientId?: string;
}

export interface UpdateCaseRequest {
  title?: string;
  description?: string;
  severity?: CaseSeverity;
  status?: CaseStatus;
  assigneeId?: string;
}

export interface CreateCommentRequest {
  authorId: string;
  message: string;
}

export interface PresignAttachmentRequest {
  type: CaseAttachmentType | string;
  contentType: string;
  size: number;
  description?: string;
}

export interface CommitAttachmentRequest {
  type: CaseAttachmentType | string;
  description?: string;
  canonicalUrl: string;
  contentType: string;
  sha256: string;
  size: number;
}

export class CaseAttachmentsModule {
  constructor(private readonly transport: Transport) {}

  list(caseId: string): Promise<{ attachments: CaseAttachment[] }> {
    return this.transport.request<{ attachments: CaseAttachment[] }>(
      `/cases/${encodeURIComponent(caseId)}/attachments`,
    );
  }

  presign(
    caseId: string,
    body: PresignAttachmentRequest,
    idempotencyKey: string,
  ): Promise<OperationsPresignedUpload> {
    return this.transport.request<OperationsPresignedUpload>(
      `/cases/${encodeURIComponent(caseId)}/attachments/presign`,
      {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
  }

  commit(
    caseId: string,
    body: CommitAttachmentRequest,
    idempotencyKey: string,
  ): Promise<CaseRecord> {
    return this.transport.request<CaseRecord>(
      `/cases/${encodeURIComponent(caseId)}/attachments`,
      {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
  }

  delete(caseId: string, idx: number): Promise<CaseRecord> {
    return this.transport.request<CaseRecord>(
      `/cases/${encodeURIComponent(caseId)}/attachments/${idx}`,
      { method: 'DELETE' },
    );
  }
}

export class CasesModule {
  readonly attachments: CaseAttachmentsModule;

  constructor(private readonly transport: Transport) {
    this.attachments = new CaseAttachmentsModule(transport);
  }

  list(opts: ListCasesOptions = {}): Promise<PaginatedResponse<CaseRecord> | CaseRecord[]> {
    return this.transport.request<PaginatedResponse<CaseRecord> | CaseRecord[]>(
      '/cases',
      { query: opts as Record<string, never> },
    );
  }

  create(
    body: CreateCaseRequest,
    idempotencyKey: string,
  ): Promise<CaseRecord> {
    return this.transport.request<CaseRecord>('/cases', {
      method: 'POST',
      body,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  get(id: string): Promise<CaseRecord> {
    return this.transport.request<CaseRecord>(
      `/cases/${encodeURIComponent(id)}`,
    );
  }

  update(id: string, body: UpdateCaseRequest): Promise<CaseRecord> {
    return this.transport.request<CaseRecord>(
      `/cases/${encodeURIComponent(id)}`,
      { method: 'PATCH', body },
    );
  }

  addComment(
    id: string,
    body: CreateCommentRequest,
    idempotencyKey: string,
  ): Promise<CaseRecord> {
    return this.transport.request<CaseRecord>(
      `/cases/${encodeURIComponent(id)}/comments`,
      {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
  }
}
