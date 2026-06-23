<required_reading>

Read these before building:
1. `references/component-lifecycle.md`
2. `references/example-components.md`
3. `references/shape-design.md`
4. `references/action-patterns.md`
5. `references/action-container-credentials.md`
6. `references/subscription-wiring.md`

</required_reading>

<process>

## Step 1: Classify The Component

Decide which pattern fits:
- seed-only
- public reactive
- private / secret-backed
- cron / mixed

Prefer the lightest pattern that satisfies the requirement.

## Step 2: Choose Identity

Pick:
- reverse-DNS `id`, e.g. `com.acme.IncidentDigest`
- human `name`, e.g. `incident-digest`
- initial `version`, usually `0.1.0`
- short `description`

Use the same `id`, `name`, and `version` in both `component.json` and `manifest.json`.

## Step 3: Design Shapes And Config

Define:
- input shapes
- output/result shapes
- config needs under `ComponentConfig/<component-name>` if needed
- seed data that should exist immediately after install

Do not let the action write back into its own trigger shape unless the loop is intentional.

## Step 4: Design The Handler

The handler is a service you deploy that receives webhook deliveries. Decide:
- where it runs and its public HTTPS URL (the subscription's `webhookUrl`)
- how it reads the delivery body and dispatches work
- how it authenticates back to WarmHub (its own `WH_TOKEN` PAT)
- whether deliveries must be authenticated (bind a `WEBHOOK_*` credential set)

The component repo can hold the handler source (e.g. `actions/` or `src/`), but the running endpoint
is hosted by you. There is no managed in-platform execution.

## Step 5: Design Subscriptions

For each subscription decide:
- event vs cron trigger
- stable subscription name
- the `webhookUrl` it delivers to
- whether one credential set must be bound for inbound auth
- health requirement and teardown expectation

## Step 6: Write `warmhub/component.json`

Create `warmhub/component.json` with metadata only.

## Step 7: Write `warmhub/manifest.json`

Populate all sections:
- `component`
- `shapes`
- `credentials`
- `subscriptions`
- `seeds`
- `health`
- `teardown`

Use empty arrays/objects where a section is unused.

## Step 8: Build And Deploy The Handler

Write the handler that receives deliveries and does the work.

Examples:
- `actions/digest/run.sh`
- `src/actions/digest.ts`

Deploy it to a public HTTPS endpoint and set each subscription's `webhookUrl` to that endpoint.

## Step 9: Document Usage

Write a README that explains:
- what the component does
- required credentials and how to set them
- how installation works
- what shapes and subscriptions it creates
- what outputs operators should expect

## Step 10: Validate And Smoke Test

Run:

```bash
wh component validate ./my-component
wh component register my-component --org acme --manifest ./my-component/warmhub/manifest.json
wh component install acme/my-component --repo <org>/<repo>
wh component list --repo <org>/<repo>
wh component doctor acme/my-component --repo <org>/<repo>
```

If lifecycle commands fail with "component is not installed", re-run `wh component list --repo
<org>/<repo>` and pass the registered component ref shown there. Do not pass the reverse-DNS
manifest id unless that is exactly what the CLI lists.

Fix every validation error before declaring the component done.

</process>

<success_criteria>

- [ ] `warmhub/component.json` exists and uses a reverse-DNS id
- [ ] `warmhub/manifest.json` exists and matches `component.json`
- [ ] shapes, credentials, subscriptions, seeds, health, and teardown are all explicit
- [ ] each subscription points at a public HTTPS `webhookUrl`, with a bound credential set when
      inbound delivery auth is needed
- [ ] config uses `ComponentConfig/<component-name>` when needed
- [ ] `wh component validate` passes
- [ ] install succeeds
- [ ] `wh component doctor` reports the expected state
- [ ] README covers install, credentials, shapes, and runtime behavior

</success_criteria>
