# Example Component Patterns

Use these patterns to choose the lightest viable component design.

## Pattern A: Seed-Only Package

Best fit:
- create shapes
- seed config or starter data
- no runtime automation yet

Manifest profile:
- `shapes`: yes
- `seeds`: yes
- `subscriptions`: no
- `health.requires`: shapes and config things only

Choose this when the component is mostly packaging and install-time setup.

## Pattern B: Event-Driven Webhook Component

Best fit:
- reactive behavior on writes to a shape
- a handler you deploy at a public HTTPS endpoint

Manifest profile:
- `subscriptions[].trigger.kind = "event"`
- `subscriptions[].webhookUrl` pointing at your deployed handler
- optional bound credential set for inbound delivery auth

Choose this when the component needs to react to graph changes.

## Pattern C: Secret-Backed Webhook Component

Best fit:
- inbound deliveries must be authenticated
- the handler endpoint should verify the caller is WarmHub

Manifest profile:
- one credential set containing the needed `WEBHOOK_*` keys
- `subscriptions[].credentials` binding that set
- the handler verifies the delivery signature or auth header

Choose this whenever a delivery to your endpoint must be trusted before it acts.

## Pattern D: Scheduled Or Mixed Workflow Component

Best fit:
- scheduled syncs, cleanup, summarization, or maintenance
- one component owns several subscriptions
- operator-visible health state matters

Manifest profile:
- event subscriptions when needed; an external scheduler calls the deployed handler directly
- explicit `health.requires`
- explicit `teardown.subscriptions`

Choose this only after simpler seed-only or single-event patterns stop being enough.

## Selection Rule

Start at Pattern A and move upward only when the requirement forces it.
