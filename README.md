# @conomyhq/api-client

Typed HTTP client for the Conomy API Gateway. Wraps `fetch` with auth
forwarding, error normalization (via `@conomyhq/types/errors`), and
typed resource modules (`payments`, `accounts`, …).

## Install

```bash
npm install @conomyhq/api-client
```

Peer dep: `@conomyhq/types`.

## Use

```ts
import { createApiClient, NotFoundError } from '@conomyhq/api-client';
import { asPaymentId } from '@conomyhq/types';

const api = createApiClient({
  baseUrl: 'https://api.conomyhq.com/sandbox',
  getAccessToken: () => auth0.getAccessToken(),
  apiKey: process.env.CONOMY_API_KEY,
  onUnauthorized: () => router.push('/auth/logout'),
});

try {
  const detail = await api.payments.get(asPaymentId('abc'));
} catch (err) {
  if (err instanceof NotFoundError) router.push('/404');
  else throw err;
}
```

## Status

v0.1.0 — reference module (`payments`). Remaining modules follow:
accounts, customers, identities, paymentLinks, geoDistribution, fx.
Each one mirrors the wallet's `bff/*/repository` shape.
