# Action Patterns

A component reacts to events by declaring **subscriptions**. Each subscription has:
- a `trigger` — `{ "kind": "event", "shape": "...", "filter"?: {...} }`
- a `webhookUrl` — a public HTTPS endpoint **you operate** that receives the delivery POST and does
  the work
- optional `credentials` — a bound credential set for inbound delivery auth (and any handler secrets)

> WarmHub does not run component code in a managed container, and the manifest has no
> `actions` array. The handler is a service you deploy; the subscription just points at its URL.

Choose the simplest pattern that fits.

## 1. Seed-Only Component

If the component only creates shapes, starter data, or config, skip subscriptions entirely.

```json
{
  "subscriptions": [],
  "seeds": [
    {
      "kind": "thing",
      "shape": "ComponentConfig",
      "name": "incident-digest",
      "data": { "enabled": true, "maxItems": 20 }
    }
  ]
}
```

Use this for configuration packages, schema bundles, and bootstrapping components.

## 2. Event-Driven Webhook

Use when the component should react to writes on a shape. The subscription fires on matching
operations and POSTs the event to your handler.

```json
{
  "subscriptions": [
    {
      "name": "incident/process-event",
      "trigger": { "kind": "event", "shape": "IncidentEvent" },
      "webhookUrl": "https://handler.example.com/incident/process"
    }
  ]
}
```

Notes:
- the handler reads the delivery body, processes the matched operations, and writes results back
  using its own `WH_TOKEN` PAT
- omit `credentials` when the endpoint does not need to verify the caller and the handler needs no
  extra secrets

## 3. Externally Scheduled Handler

Use an external scheduler you operate for scheduled syncs, cleanup, summarization, or recurring
checks. It calls the deployed handler directly; there is no cron subscription in the manifest or
WarmHub CLI. Authenticate that request with the handler's own access controls.

## 4. Secret-Backed Webhook

Use when inbound deliveries must be authenticated, or the handler needs runtime secrets. Declare a
credential set and bind it to the subscription. The platform attaches auth headers to each delivery;
the handler reads any other secrets from its deploy environment.

```json
{
  "credentials": [
    {
      "name": "digest-runtime",
      "requiredKeys": [
        { "key": "WEBHOOK_SIGNING_SECRET" }
      ]
    }
  ],
  "subscriptions": [
    {
      "name": "incident/process-event",
      "trigger": { "kind": "event", "shape": "IncidentEvent" },
      "webhookUrl": "https://handler.example.com/incident/process",
      "credentials": ["digest-runtime"]
    }
  ]
}
```

A `WEBHOOK_SIGNING_SECRET` makes WarmHub sign each delivery (`X-WarmHub-Signature` HMAC-SHA256 +
`X-WarmHub-Timestamp`) so the handler can confirm the request is genuine. Use `WEBHOOK_BEARER_TOKEN`
or `WEBHOOK_API_KEY` instead if your endpoint prefers a static auth header.

## Webhook Delivery Body

WarmHub POSTs JSON to `webhookUrl`:

| Field | Description |
|-------|-------------|
| `event` | `"warmhub.write"` or `"warmhub.retract"` |
| `traceId`, `runId`, `subscriptionId` | Identifiers for the run and chain |
| `repo` | `{ "orgName", "repoName" }` — the subscription's home repo |
| `callback_url` | Endpoint to report async progress / terminal outcome |
| `matchedOperations` | The operations matched by the subscription filter |

Headers include `X-WarmHub-Idempotency-Key`, `X-WarmHub-Run-Id`, and `X-WarmHub-Attempt`.

## Handling A Delivery

The handler parses the POST body and does the work. It authenticates back to WarmHub with its own
`WH_TOKEN` PAT — there is no token injected on stdin.

### Bash

```bash
#!/usr/bin/env bash
set -euo pipefail

body="$(cat)"                                   # the webhook delivery body
repo="$(jq -r '.repo.orgName + "/" + .repo.repoName' <<<"$body")"
# WH_TOKEN comes from the handler's environment
wh shape head IncidentEvent --repo "$repo"
```

### TypeScript

```ts
import { WarmHubClient } from '@warmhub/sdk-ts'

const body = JSON.parse(await Bun.stdin.text()) as Record<string, unknown>
const repo = body.repo as { orgName: string; repoName: string }
const client = new WarmHubClient({
  auth: {
    getToken: async () => {
      const token = process.env.WH_TOKEN
      if (!token) throw new Error('WH_TOKEN is required')
      return token
    },
  },
})
```

## Pattern Selection Rules

- start with seed-only if no runtime work is needed
- use an event webhook when the component reacts to writes on a shape
- use an external scheduler to invoke the handler when time-based automation is genuinely needed
- add a bound credential set when deliveries must be authenticated or the handler needs secrets
- avoid mixing many subscriptions unless the component clearly benefits from several triggers
