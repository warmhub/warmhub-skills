<required_reading>

Read these before building:
1. `references/component-lifecycle.md`
2. `references/example-components.md`
3. `references/shape-design.md`

After classifying the component, read only what its pattern needs:

- `references/action-patterns.md` for a handler or external schedule
- `references/subscription-wiring.md` for subscriptions
- `references/action-container-credentials.md` for bound delivery credentials or secret-backed work

A seed-only package does not need handler or subscription guidance.

</required_reading>

<process>

## Step 1: Classify The Component

Decide which pattern fits:
- seed-only
- public reactive
- private / secret-backed
- scheduled / mixed

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

Skip this and the automation step for a seed-only package.

The handler is a service you deploy that receives webhook deliveries. Decide:
- where it runs and its public HTTPS URL (the subscription's `webhookUrl`)
- how it verifies raw deliveries, parses the body, and dispatches idempotent work
- how it authenticates back to WarmHub (its deployment token or a narrowly scoped runtime token)
- whether deliveries must be authenticated (bind a `WEBHOOK_*` credential set)

The component repo can hold the handler source (e.g. `actions/` or `src/`), but the running endpoint
is hosted by you. There is no managed in-platform execution.

## Step 5: Design Automation

For each event subscription decide:
- stable subscription name
- the `webhookUrl` it delivers to
- whether one credential set must be bound for inbound auth
- doctor-state and teardown expectation

For scheduled work, configure an external scheduler to call the handler and use the handler's own
access controls.

Use a registered setup endpoint only when setup-owned resources or external install state require it.
Mark only those resources `provisioning: "setup"`; otherwise keep manifest provisioning. Declare
`runtimeAccess` only for runtime reads/writes, and include `ComponentConfig` writes when exposing
`cli.methods`.

Register setup explicitly: pass `--setup-url`, `--uninstall-url` when needed, `--allowed-callback`
for allowed setup callback hosts, and `--credential-set-name` when setup needs an org credential set.
`--minted-tokens` is required for setup/runtime tokens and defaults off.

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

When the component uses deliveries or external scheduling, write the handler that receives requests
and does the work. Skip this step for a seed-only package.

Example: `src/handler.ts` served at `https://handler.example.com/digest`.

Deploy it to a public HTTPS endpoint and set each subscription's `webhookUrl` to that endpoint.
When a delivery credential is bound, verify it before parsing. Deduplicate retries with
`X-WarmHub-Idempotency-Key` or `runId`, and treat `repoSeq` as optional.

## Step 9: Document Usage

Write a README that explains:
- what the component does
- required credentials and how to set them
- how installation works
- what shapes and subscriptions it creates
- what outputs operators should expect
- for each subscription, the bound credential or intentional unsigned-delivery boundary

## Step 10: Validate And Smoke Test

Run:

```bash
wh component validate ./my-component
wh component register my-component --org acme --manifest ./my-component/warmhub/manifest.json
wh component install acme/my-component --repo <org>/<repo>
wh component list --repo <org>/<repo>
wh component doctor acme/my-component --repo <org>/<repo>
wh component update acme/my-component --repo <org>/<repo>
```

If lifecycle commands fail with "component is not installed", re-run `wh component list --repo
<org>/<repo>` and pass the registered component ref shown there. Do not pass the reverse-DNS
manifest id unless that is exactly what the CLI lists.

Fix every validation error before declaring the component done.

</process>

<success_criteria>

- [ ] `warmhub/component.json` exists and uses a reverse-DNS id
- [ ] `warmhub/manifest.json` exists and matches `component.json`
- [ ] shapes, credentials, subscriptions, seeds, health (metadata), and teardown are all explicit
- [ ] each subscription points at a public HTTPS `webhookUrl`, with a bound credential set when
      inbound delivery auth is needed
- [ ] setup-owned resources, runtime access, and CLI methods are declared only when required
- [ ] config uses `ComponentConfig/<component-name>` when needed
- [ ] `wh component validate` passes
- [ ] install succeeds
- [ ] `wh component doctor` reports the expected state
- [ ] README covers install, credentials, shapes, and runtime behavior

</success_criteria>
