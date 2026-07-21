# Auth Pattern

A WarmHub ingestion repo deals with auth in two directions:

1. **Outbound (your code → WarmHub):** writing things/assertions. This always uses a `WH_TOKEN` PAT —
   in local dev, CI, and the deployed webhook handler alike.
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
wh token create --name my-data-ingest --scope repo:write
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

## Webhook Delivery Payload

When a subscription fires, WarmHub sends an HTTP POST to your handler's `webhookUrl`. The JSON body
includes:

| Field | Description |
|-------|-------------|
| `event` | `"warmhub.write"` or `"warmhub.retract"` |
| `traceId` | Trace identifier for the event chain |
| `runId` | Action run identifier |
| `subscriptionId` | Subscription identifier |
| `repo` | `{ "orgName", "repoName" }` — the subscription's home repo |
| `callback_url` | Endpoint to report async progress / terminal outcome (post with normal `repo:write` auth) |
| `matchedOperations` | Operations matched by the subscription filter |

Delivery headers include `X-WarmHub-Idempotency-Key`, `X-WarmHub-Run-Id`, and `X-WarmHub-Attempt`.

### Reading The Delivery In A Handler

The handler parses the POST body and dispatches the matching command. There is no stdin token to
read, and the SDK does not read environment variables by itself; the client gets its token through
the `auth.getToken` provider above, which reads `WH_TOKEN`.

```typescript
import { getValidToken } from './auth.js'

// Parse the webhook delivery body and decide what to run.
async function readDeliveryInput(rawBody: string): Promise<{ event: string; repo?: unknown }> {
  try {
    const input = JSON.parse(rawBody)
    return { event: input.event, repo: input.repo }
  } catch {
    return { event: 'unknown' }
  }
}
```

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

## Auth Summary

| Direction | Mechanism | Setup |
|-----------|-----------|-------|
| Local dev → WarmHub | `WH_TOKEN` PAT | `wh token create --name <name> --scope repo:write` |
| CI → WarmHub | `WH_TOKEN` PAT | store as CI secret |
| Webhook handler → WarmHub | `WH_TOKEN` PAT | set in the handler's deploy env |
| WarmHub → webhook handler | bound `WEBHOOK_*` credential set | `wh credential set …` + `wh sub bind …` |
