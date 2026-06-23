# Credentials And Inbound Delivery Auth

Component manifests declare credential sets up front, then bind one to a subscription so WarmHub can
authenticate each webhook delivery to your handler.

## The Current Model

1. Declare credential sets in `manifest.credentials`
2. Bind one credential set to a subscription via `subscription.credentials`
3. Populate the set's `WEBHOOK_*` keys with `wh credential set`
4. WarmHub attaches the corresponding auth headers to every delivery POST sent to the
   subscription's `webhookUrl`

> There is no manifest `actions` array, no `source.auth` clone step, and no per-run token injected
> into a managed container. The handler is a service you deploy; it authenticates back to WarmHub
> with its own `WH_TOKEN` PAT and reads any other secrets from its own deploy environment.

## Declare A Credential Set

```json
{
  "credentials": [
    {
      "name": "digest-runtime",
      "description": "Inbound delivery auth for the digest handler",
      "requiredKeys": [
        { "key": "WEBHOOK_SIGNING_SECRET", "description": "HMAC secret for delivery signatures" }
      ]
    }
  ]
}
```

## Bind The Credential Set To The Subscription

```json
{
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

If `subscription.credentials` is omitted, deliveries are sent without auth headers and your handler
cannot cryptographically confirm the caller.

## Supported `WEBHOOK_*` Keys

| Credential key | Header WarmHub sends on each delivery |
|----------------|----------------------------------------|
| `WEBHOOK_BEARER_TOKEN` | `Authorization: Bearer <value>` |
| `WEBHOOK_API_KEY` (+ optional `WEBHOOK_API_KEY_HEADER`) | `X-API-Key: <value>` (or the custom header name) |
| `WEBHOOK_BASIC_USERNAME` + `WEBHOOK_BASIC_PASSWORD` | `Authorization: Basic <base64>` |
| `WEBHOOK_SIGNING_SECRET` | `X-WarmHub-Signature` (HMAC-SHA256 over `timestamp.body`) + `X-WarmHub-Timestamp` |

Pick one scheme. Signing is the most robust because it binds the auth to the request body.

## Operator Setup Commands

Create the credential set once, then populate keys:

```bash
wh credential create digest-runtime --repo acme/platform
echo "<shared-secret>" | wh credential set digest-runtime WEBHOOK_SIGNING_SECRET --repo acme/platform
wh sub bind incident/process-event --credentials digest-runtime --repo acme/platform
```

Notes:
- `wh credential create` creates an empty set
- keys are added with `wh credential set`
- `wh sub bind` attaches the set to an existing subscription (manifest install does this for declared
  subscriptions automatically)

## Handler Secrets

The handler's own runtime secrets (model API keys, downstream tokens, its `WH_TOKEN` PAT) live in the
handler's deploy environment — they are **not** delivered by WarmHub. Only the `WEBHOOK_*` keys above
affect the delivery itself.

## Validation Checklist

Before shipping a secret-backed subscription, confirm:
- the bound set exists in `manifest.credentials`
- `subscription.credentials` contains at most one set
- the set's `requiredKeys` use supported `WEBHOOK_*` names
- the handler verifies the matching header/signature on every request
- `wh component validate ./component` passes cleanly
