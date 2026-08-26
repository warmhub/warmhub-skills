# Handler Patterns

A component subscription POSTs to a public HTTPS handler that its operator deploys. WarmHub does
not execute component code, host a container, invoke a repo script, or schedule cron work. Keep
handler source in the component repo only as deployable source; an external scheduler must call the
handler directly.

## Choose the smallest pattern

| Need | Manifest/runtime choice |
|---|---|
| Shapes, config, or starter data only | Seed-only: no subscriptions or handler. |
| React to writes | One event subscription to an external HTTPS handler. |
| Authenticate inbound delivery | Bind one credential set with a delivery auth key. |
| Scheduled work | External scheduler calls the handler; do not add a cron subscription. |

Keep trigger and output shapes separate unless a loop is explicitly intended.

## Event subscription

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

The trigger compiles to a webhook subscription. `kind: "webhook"` is optional advisory metadata;
the effective kind comes from `trigger.kind`. `fallbackWebhookUrl` is optional and is an alert target
after final primary failure, not a second primary processor.

## Delivery contract

Read raw request bytes before parsing JSON. When a delivery credential is bound, authenticate those
bytes first; otherwise follow the explicit unsigned-delivery decision. For commit deliveries,
expect:

| Field | Meaning |
|---|---|
| `event` | `warmhub.write` or `warmhub.retract` |
| `runId`, `traceId`, `subscriptionName` | Delivery/run correlation |
| `callback_url` | Report asynchronous `processing`, `success`, `failure`, or `retry_requested` |
| `repo` | The subscription's home repo |
| `originRepoName` | Present for a cross-repo source |
| `matchedOperationIndexes`, `matchedOperations` | Matching operation context |
| `repoSeq` | Optional non-negative commit sequence; absent for cron and metadata events. For a cross-repo subscription it belongs to the source repo, not `repo`. |

Metadata events use `event: "warmhub.<eventType>"` and `data`, not matched operations. Do not make
`repoSeq` required or substitute a fake zero.

The platform supplies `X-WarmHub-Idempotency-Key`, `X-WarmHub-Run-Id`, and `X-WarmHub-Attempt`.
Deduplicate irreversible work with the idempotency key or `runId`; retries may invoke the handler
more than once.

## Outcomes and failure handling

Return a successful response for synchronous work. For accepted asynchronous work, use
`callback_url`; a `failure` callback or callback timeout is terminal and lands in `dead_letter`.
Authenticate a repo callback with `repo:action-callback`, not `repo:write`; the latter is only a
transitional compatibility fallback. An org metadata callback instead needs `org:action-callback`.
A component runtime token with declared writes also passes the callback gate; a separate PAT is not
required.

WarmHub makes at most five attempts for retryable failures (`HTTP_429`, `HTTP_5xx`, network, and
transient credential-resolution errors), with exponential backoff. Non-retryable failures go to
`failed_terminal`; exhausted retries and callback failures go to `dead_letter`. A configured fallback
receives a failure notification only after the primary result is terminal; it does not rerun the
original webhook. Retry-exhausted deliveries notify at terminal completion, before any fallback
notification; error-code-classified failures with a configured fallback defer notification until the
fallback settles. Suppressed authority-revoked deliveries do not retry, fallback, or notify.

Use `wh sub log <name>`, `wh sub attempts <runId>`, and `wh notifications --repo <org>/<repo>` to
inspect those outcomes.
