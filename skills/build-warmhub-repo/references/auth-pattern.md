# Auth Pattern

A WarmHub ingestion repo deals with auth in two directions:

1. **Outbound (your code → WarmHub):** a normal external ingestion repo uses a `WH_TOKEN` PAT in
   local dev, CI, and its deployed webhook handler. A registered component may instead receive a
   scoped runtime token declared through `runtimeAccess`; follow `add-warmhub-component` for that path.
2. **Inbound (WarmHub → your handler):** when a webhook subscription delivers an event to
   your handler's HTTPS endpoint. This is verified with a bound credential set, not a PAT.

> WarmHub does not provide a runtime that clones your repo and runs your CLI with a short-lived
> token injected on stdin. Event
> subscriptions POST to a webhook handler **you** deploy; external schedulers call it for scheduled
> automation. The handler authenticates back to WarmHub with its own `WH_TOKEN` PAT.

**Do NOT read from `~/.warmhub/auth.json`** — that file contains the CLI's own session token and is
not the supported auth path for SDK clients.

## Creating A PAT

```bash
wh auth login
wh token create --name my-data-ingest --scope <org>/<repo>=repo:write --expires 90d
```

Save the token and export it wherever the code runs (local shell, CI secret, or the handler's
deployment environment):

```bash
export WH_TOKEN="eyJ..."
```

## Token Provider

```typescript
// src/auth.ts
export async function getValidToken(): Promise<string | undefined> {
  return process.env.WH_TOKEN
}
```

## Client Creation

```typescript
import { WarmHubClient } from '@warmhub/sdk-ts'
import { getValidToken } from './auth.js'

function createClient(): WarmHubClient {
  return new WarmHubClient({
    auth: { getToken: getValidToken },
  })
}
```

Python uses the same `WH_TOKEN` convention through the SDK's explicit environment constructor:

```python
from warmhub import WarmHubClient

with WarmHubClient.from_env() as client:
    repo = client.repository("<org>/<repo>")
```

## Webhook Delivery Payload

When a subscription fires, WarmHub sends an HTTP POST to your handler's `webhookUrl`. The JSON body
includes:

| Field | Description |
|-------|-------------|
| `event` | `"warmhub.write"`, `"warmhub.retract"`, a metadata event, or `"warmhub.cron"` on a legacy cron delivery |
| `traceId` | Trace identifier for the event chain |
| `runId` | Action run identifier |
| `subscriptionName` | Subscription name |
| `repo` | `{ "orgName", "repoName" }` for a repo subscription, or `null` for an org event |
| `callback_url` | Endpoint to report async progress / terminal outcome (prefer `repo:action-callback`; `repo:write` also permits it) |
| `matchedOperations` | Operations matched by the subscription filter, or an empty array for a legacy cron delivery |

Delivery headers include `X-WarmHub-Idempotency-Key` (stable across attempts), `X-WarmHub-Run-Id`,
and `X-WarmHub-Attempt`. Standard Webhooks deliveries also carry `webhook-id` (the same stable
delivery identity), `webhook-timestamp`, and `webhook-signature`. `repoSeq` is present in the body
only for commit-backed events; it is intentionally absent for legacy cron and metadata events.

### Authenticate The Raw Body Before Parsing

Read the exact request body once, authenticate it, then parse JSON and dispatch. There is no stdin
token to read, and the TypeScript SDK does not read environment variables by itself; the client gets its token
through the `auth.getToken` provider above, which reads `WH_TOKEN`.

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto'

function safeEqual(got: string, expected: string) {
  const left = Buffer.from(got)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

function standardKey(secret: string) {
  if (!secret.startsWith('whsec_')) return Buffer.from(secret)
  try {
    return Buffer.from(atob(secret.slice('whsec_'.length)), 'binary')
  } catch {
    return Buffer.from(secret)
  }
}

function verifyStandardWarmHubSignature(
  rawBody: string, signature: string, timestamp: string, webhookId: string, secret: string,
) {
  const expected = `v1,${createHmac('sha256', standardKey(secret))
    .update(`${webhookId}.${timestamp}.${rawBody}`).digest('base64')}`
  let matched = false
  for (const candidate of signature.split(' ')) {
    if (candidate.startsWith('v1,')) matched = safeEqual(candidate, expected) || matched
  }
  return matched
}

function verifyNativeWarmHubSignature(rawBody: string, headers: Headers, secret: string) {
  const signature = headers.get('X-WarmHub-Signature')
  const timestamp = headers.get('X-WarmHub-Timestamp')
  if (!signature || !timestamp || !Number.isSafeInteger(Number(timestamp))) return false
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false
  const expected = `sha256=${createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`).digest('hex')}`
  return safeEqual(signature, expected)
}

async function readDelivery(request: Request, secret: string) {
  const rawBody = await request.text()
  const standard = ['webhook-id', 'webhook-timestamp', 'webhook-signature']
    .map((name) => request.headers.get(name))
  if (standard.some(Boolean)) {
    const [webhookId, timestamp, signature] = standard
    if (!webhookId || !timestamp || !signature || !Number.isSafeInteger(Number(timestamp))) {
      throw new Error('invalid Standard Webhooks headers')
    }
    const verified = verifyStandardWarmHubSignature(
      rawBody, signature, timestamp, webhookId, secret,
    )
    if (!verified || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
      throw new Error('invalid Standard Webhooks delivery')
    }
    return { deliveryId: webhookId, input: JSON.parse(rawBody) }
  }

  // Only when no Standard Webhooks header exists may a receiver verify the
  // configured native X-WarmHub-Signature/X-WarmHub-Timestamp pair here.
  if (!verifyNativeWarmHubSignature(rawBody, request.headers, secret)) {
    throw new Error('invalid WarmHub delivery')
  }
  return {
    deliveryId: request.headers.get('X-WarmHub-Idempotency-Key'),
    input: JSON.parse(rawBody),
  }
}
```

Standard Webhooks headers are authoritative when present: a partial or failed Standard verification
is a rejection, never a fallback to the native signature. Deduplicate durably on `webhook-id` (or,
for native-only delivery, `X-WarmHub-Idempotency-Key`) before starting work; return a successful
acknowledgement for a completed duplicate. Treat `repoSeq` as optional ordering metadata, never as
the delivery identity.

## Verifying Inbound Deliveries

Bind a credential set with `WEBHOOK_*` keys to the subscription so the platform attaches auth to each
delivery and your handler can confirm the request is genuinely from WarmHub:

```bash
wh credential create ingest-webhook --repo <org>/<repo>
echo "<shared-secret>" | wh credential set ingest-webhook WEBHOOK_SIGNING_SECRET --repo <org>/<repo>
wh sub bind <subscription-name> --credentials ingest-webhook --repo <org>/<repo>
```

Supported keys include:

| Credential key | Header WarmHub sends |
|----------------|----------------------|
| `WEBHOOK_BEARER_TOKEN` | `Authorization: Bearer <value>` |
| `WEBHOOK_API_KEY` (+ optional `WEBHOOK_API_KEY_HEADER`) | `X-API-Key: <value>` (or custom header) |
| `WEBHOOK_BASIC_USERNAME` + `WEBHOOK_BASIC_PASSWORD` | `Authorization: Basic <base64>` |
| `WEBHOOK_SIGNING_SECRET` | `X-WarmHub-Signature` (HMAC-SHA256) + `X-WarmHub-Timestamp` |

The signing secret also produces Standard Webhooks headers. If a binding is revoked, WarmHub stops
delivery fail-closed; deleting the credential set or unbinding it instead leaves future deliveries
unsigned and unauthenticated. Revoke to stop delivery, delete or unbind only when that unauthenticated
behavior is intended.

## Retries, Dead Letters, And Fallback

WarmHub can retry a failed delivery up to five times; `429`, `5xx`, network, and transient
credential-resolution failures are retryable, while other `4xx` responses are terminal. Make handler
work idempotent by delivery identity, return `2xx` only after the synchronous work is complete, and
use the callback URL only when the handler explicitly accepts asynchronous processing. Exhausted
retries end in `dead_letter`; a configured fallback URL receives a failure notification, not a replay
of the original delivery. Monitor the subscription delivery feed/dead letters instead of silently
retrying an already accepted delivery yourself.

## Auth Summary

| Direction | Mechanism | Setup |
|-----------|-----------|-------|
| Local dev → WarmHub | `WH_TOKEN` PAT | `wh token create --name <name> --scope <org>/<repo>=repo:write --expires 90d` |
| CI → WarmHub | `WH_TOKEN` PAT | store as CI secret |
| Webhook handler → WarmHub | `WH_TOKEN` PAT | set in the handler's deploy env |
| WarmHub → webhook handler | bound `WEBHOOK_*` credential set | `wh credential set …` + `wh sub bind …` |
