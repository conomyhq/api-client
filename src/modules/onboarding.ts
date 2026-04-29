import type {
  ApproveOnboardingResponse,
  CreateOnboardingApplicationRequest,
  CreateOnboardingApplicationResponse,
  ListOnboardingApplicationsResponse,
  OnboardingApplication,
  OnboardingApplicationStatus,
  OnboardingDocumentType,
  OnboardingOperationalConfig,
  OperationsPresignedUpload,
  ProspectOnboardingDocumentCommitRequest,
  ProspectOnboardingDocumentPresignRequest,
  ProspectOnboardingPatchRequest,
  RejectOnboardingRequest,
  RequestChangesOnboardingRequest,
} from '@conomyhq/core';
import type { Transport } from '../transport';

/**
 * Onboarding applications — both sides of the F10 flow:
 *
 *  - operator side under `/onboarding-applications/*` (Auth0 session,
 *    operator dashboard).
 *  - prospect side under `/onboarding/{token}/*` (token-auth, the link
 *    we email to the prospect — token validates via HMAC against the
 *    stored Token.Hash).
 *
 * Submodules `applications` and `prospect` keep the two trees
 * tab-completable and prevent operator-only verbs from being called
 * with a token (and vice-versa) at the type level.
 */

export interface ListOnboardingApplicationsOptions {
  status?: OnboardingApplicationStatus | '';
  limit?: number;
  cursor?: string;
}

// ---------- Operator-side ----------------------------------------------------

export class OnboardingApplicationsModule {
  constructor(private readonly transport: Transport) {}

  create(
    body: CreateOnboardingApplicationRequest,
    idempotencyKey: string,
  ): Promise<CreateOnboardingApplicationResponse> {
    return this.transport.request<CreateOnboardingApplicationResponse>(
      '/onboarding-applications',
      {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
  }

  list(
    opts: ListOnboardingApplicationsOptions = {},
  ): Promise<ListOnboardingApplicationsResponse> {
    return this.transport.request<ListOnboardingApplicationsResponse>(
      '/onboarding-applications',
      { query: opts as Record<string, never> },
    );
  }

  get(id: string): Promise<OnboardingApplication> {
    return this.transport.request<OnboardingApplication>(
      `/onboarding-applications/${encodeURIComponent(id)}`,
    );
  }

  /** PATCH /onboarding-applications/{id} — operator fills the
   *  OperationalConfig (currencies, fees, allowed products, default
   *  org/staff). Application must be in PENDING_REVIEW or
   *  CHANGES_REQUESTED. */
  patchOperationalConfig(
    id: string,
    operationalConfig: OnboardingOperationalConfig,
    idempotencyKey: string,
  ): Promise<OnboardingApplication> {
    return this.transport.request<OnboardingApplication>(
      `/onboarding-applications/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: { operationalConfig },
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
  }

  reject(
    id: string,
    body: RejectOnboardingRequest,
    idempotencyKey: string,
  ): Promise<OnboardingApplication> {
    return this.transport.request<OnboardingApplication>(
      `/onboarding-applications/${encodeURIComponent(id)}/reject`,
      {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
  }

  requestChanges(
    id: string,
    body: RequestChangesOnboardingRequest,
    idempotencyKey: string,
  ): Promise<CreateOnboardingApplicationResponse> {
    return this.transport.request<CreateOnboardingApplicationResponse>(
      `/onboarding-applications/${encodeURIComponent(id)}/request-changes`,
      {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
  }

  resendLink(
    id: string,
    idempotencyKey: string,
  ): Promise<CreateOnboardingApplicationResponse> {
    return this.transport.request<CreateOnboardingApplicationResponse>(
      `/onboarding-applications/${encodeURIComponent(id)}/resend-link`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
  }

  /** POST /onboarding-applications/{id}/approve — fires the saga.
   *  Returns the updated application; status will be APPROVED on
   *  success or APPROVE_FAILED with a populated `lastError` on
   *  failure (idempotent retry: re-call to continue from the last
   *  failed stage). */
  approve(
    id: string,
    idempotencyKey: string,
  ): Promise<ApproveOnboardingResponse | OnboardingApplication> {
    return this.transport.request<ApproveOnboardingResponse | OnboardingApplication>(
      `/onboarding-applications/${encodeURIComponent(id)}/approve`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
  }

  // -- Documents (operator side) --------------------------------------------

  presignDocument(
    id: string,
    body: {
      type: OnboardingDocumentType | string;
      contentType: string;
      size: number;
      description?: string;
    },
    idempotencyKey: string,
  ): Promise<OperationsPresignedUpload> {
    return this.transport.request<OperationsPresignedUpload>(
      `/onboarding-applications/${encodeURIComponent(id)}/documents/presign`,
      {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
  }

  commitDocument(
    id: string,
    body: {
      type: OnboardingDocumentType | string;
      description?: string;
      canonicalUrl: string;
      contentType: string;
      sha256: string;
      size: number;
    },
    idempotencyKey: string,
  ): Promise<OnboardingApplication> {
    return this.transport.request<OnboardingApplication>(
      `/onboarding-applications/${encodeURIComponent(id)}/documents`,
      {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
  }

  deleteDocument(id: string, idx: number): Promise<OnboardingApplication> {
    return this.transport.request<OnboardingApplication>(
      `/onboarding-applications/${encodeURIComponent(id)}/documents/${idx}`,
      { method: 'DELETE' },
    );
  }
}

// ---------- Prospect-side (token-auth) ---------------------------------------

/**
 * Prospect-side routes. The token is the URL credential — pass it as
 * the first argument to every method. The api-client does not auto-add
 * Bearer auth here; the path itself is the credential.
 */
export class OnboardingProspectModule {
  constructor(private readonly transport: Transport) {}

  get(token: string): Promise<OnboardingApplication> {
    return this.transport.request<OnboardingApplication>(
      `/onboarding/${encodeURIComponent(token)}`,
    );
  }

  patch(
    token: string,
    sections: ProspectOnboardingPatchRequest,
  ): Promise<OnboardingApplication> {
    return this.transport.request<OnboardingApplication>(
      `/onboarding/${encodeURIComponent(token)}`,
      { method: 'PATCH', body: sections },
    );
  }

  submit(token: string): Promise<OnboardingApplication> {
    return this.transport.request<OnboardingApplication>(
      `/onboarding/${encodeURIComponent(token)}/submit`,
      { method: 'POST' },
    );
  }

  presignDocument(
    token: string,
    body: ProspectOnboardingDocumentPresignRequest,
  ): Promise<OperationsPresignedUpload> {
    return this.transport.request<OperationsPresignedUpload>(
      `/onboarding/${encodeURIComponent(token)}/documents/presign`,
      { method: 'POST', body },
    );
  }

  commitDocument(
    token: string,
    body: ProspectOnboardingDocumentCommitRequest,
  ): Promise<OnboardingApplication> {
    return this.transport.request<OnboardingApplication>(
      `/onboarding/${encodeURIComponent(token)}/documents`,
      { method: 'POST', body },
    );
  }

  deleteDocument(token: string, idx: number): Promise<OnboardingApplication> {
    return this.transport.request<OnboardingApplication>(
      `/onboarding/${encodeURIComponent(token)}/documents/${idx}`,
      { method: 'DELETE' },
    );
  }
}

// ---------- Aggregate --------------------------------------------------------

export class OnboardingModule {
  readonly applications: OnboardingApplicationsModule;
  readonly prospect: OnboardingProspectModule;

  constructor(transport: Transport) {
    this.applications = new OnboardingApplicationsModule(transport);
    this.prospect = new OnboardingProspectModule(transport);
  }
}
