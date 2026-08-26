# Subscription Wiring

A component manifest declares webhook subscriptions. Each target is a public HTTPS endpoint operated
by the component author. The installer validates the primary and optional fallback URL at create and
delivery time: HTTPS, allowed public port, canonical public host, and no URL credentials. Do not use
localhost, private addresses, a managed action runtime, or a manifest cron subscription.

## Event subscriptions

```json
{
  "subscriptions": [
    {
      "name": "incident/process-event",
      "trigger": {
        "kind": "event",
        "shape": "IncidentEvent",
        "filter": { "shape": "IncidentEvent" }
      },
      "webhookUrl": "https://handler.example.com/incident/process",
      "fallbackWebhookUrl": "https://handler.example.com/incident/failure",
      "credentials": ["incident-webhook"]
    }
  ]
}
```

- `trigger.shape` is required for commit events and must be a declared shape or subscription-trigger
  built-in. `filter` is optional.
- Metadata triggers (`repo.renamed`, `thing.renamed`, `shape.renamed`) have no shape or filter.
- A fallback URL receives a terminal-failure notification. It is not a retry route and does not process
  the original event.
- Bind at most one declared credential set. See `action-container-credentials.md` for authentication
  and signing.
- For recurring work, use an external scheduler with the handler's own access controls.

## Provisioning and doctor

Use `provisioning: "setup"` only when the registered setup endpoint creates this subscription with
its scoped setup token. Otherwise omit it for normal manifest provisioning. Setup replay can update a
setup-owned URL only within the manifest's allowed origin/template and cannot change trigger/source
or turn trace reentry on.

`health.requires` is reserved metadata and is not currently evaluated. Doctor checks resources
declared directly in the installed manifest, including subscription activity, credentials, shapes,
and seeds; do not present `health.requires` as an enforced contract.

## Update, teardown, and operator control

Update creates missing subscriptions and can revise declared mutable configuration, but it does not
delete subscriptions absent from the newer manifest. It never resumes a paused subscription. Terminal
component teardown pauses owned subscriptions, preserves their rows and ownership, and does not start
the handler or any external scheduler on reinstall. Preserve a user-operated handler and any manual
pause/resume decision; use `wh sub resume <name>` only when the operator asks to reactivate it.

Before install, confirm the endpoint is deployed and reachable, handler output does not self-trigger,
credential binding matches handler verification, and the fallback receiver is an alert endpoint.
