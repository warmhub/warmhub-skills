# Credentials and Delivery Authentication

Declare a credential set in `manifest.credentials`, then bind its single name through
`subscriptions[].credentials`. The manifest installer creates manifest-provisioned sets; operators
populate the values. Setup-provisioned sets are created and filled by the registered setup endpoint.
Handler runtime secrets, including its WarmHub access token, stay in the handler's own deployment
environment and are never injected by a subscription.

```json
{
  "credentials": [
    {
      "name": "digest-webhook",
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
      "credentials": ["digest-webhook"]
    }
  ]
}
```

One credential set is the current subscription limit. Valid primary-delivery keys are
`WEBHOOK_BEARER_TOKEN`, `WEBHOOK_API_KEY` (plus optional `WEBHOOK_API_KEY_HEADER`),
`WEBHOOK_BASIC_USERNAME` plus `WEBHOOK_BASIC_PASSWORD`, and `WEBHOOK_SIGNING_SECRET`. Equivalent
`FALLBACK_*` keys authenticate only fallback notifications.

## Signing verification

With `WEBHOOK_SIGNING_SECRET`, WarmHub dual-signs a delivery when it has a stable webhook message
ID. Preserve the exact raw body and use constant-time comparison with a freshness window.

- Standard Webhooks: `webhook-id`, `webhook-timestamp`, and `webhook-signature`. Verify a matching
  `v1,<base64>` entry (the header can list more than one) over
  `<webhook-id>.<webhook-timestamp>.<raw-body>`. A `whsec_` secret is decoded as Standard Webhooks
  key material when it is valid base64; otherwise it uses raw bytes.
- Native compatibility headers: `X-WarmHub-Signature: sha256=<hex>` and `X-WarmHub-Timestamp`.
  Verify HMAC-SHA256 over `<timestamp>.<raw-body>` with the secret's raw UTF-8 bytes.

The header-family rule prevents downgrade attacks: all three Standard Webhooks headers present means
verify that family authoritatively; a partial Standard Webhooks set is invalid; only when none are
present may a handler verify the native pair. Never fall back to native verification after a present
Standard Webhooks signature fails. Fallback deliveries follow the same dual-signing rule when a
stable message ID and `FALLBACK_SIGNING_SECRET` are available.

WarmHub has no dual-secret rotation window. Make the handler accept old and new secrets, update the
credential value, then remove the old secret after confirmed delivery.

## Binding loss is not one behavior

- **Revoked credential set:** fail closed. No primary or fallback outbound delivery is sent; a
  transient credential-resolution error is retryable.
- **Deleted credential set:** treated as no binding. Future delivery continues unsigned and without
  injected auth headers.
- **Unbound credential set:** also treated as no binding. Future delivery continues unsigned and
  without injected auth headers.

Revoke rather than delete a set when deliveries must stop. Operators bind or unbind existing
subscriptions with `wh sub bind <name> --credentials <set>` and `wh sub unbind <name>`; declared
manifest bindings are applied at install/reconcile.
