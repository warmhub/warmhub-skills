<required_reading>

Read these before componentizing:
1. `references/component-lifecycle.md`
2. `references/example-components.md`
3. `references/shape-design.md`

After choosing the pattern, read only what it needs:

- `references/action-patterns.md` for a handler or external schedule
- `references/subscription-wiring.md` for subscriptions
- `references/action-container-credentials.md` for bound delivery credentials or secret-backed work

</required_reading>

<process>

## Step 1: Audit The Existing Repo

Inspect the repo and capture:
- what code already exists that should run as the webhook handler
- whether the repo is public or private
- whether it already has scripts/commands that can be invoked per delivery by a handler endpoint
- whether it needs config, secrets, scheduled work, or event triggers
- where the handler can be deployed and what its public HTTPS URL will be
- whether a setup endpoint, minted runtime access, or an operator CLI method is required

## Step 2: Pick The Lightest Component Pattern

Map the repo to one of these:
- seed-only package
- public reactive component
- private / secret-backed component
- scheduled / mixed component

Do not invent extra manifest sections the repo does not need.

## Step 3: Choose Component Identity

Derive:
- reverse-DNS `id`
- kebab-case `name`
- initial `version`
- short `description`

The component id is the durable manifest/install-record identity; the repo name can inform the
human-facing `name`.

## Step 4: Map Existing Files Into The Manifest

Translate the repo into declarative resources:
- existing schemas or domain entities -> `shapes`
- existing config or bootstrap data -> `seeds`
- existing worker scripts / commands -> the deployed webhook handler behind a `webhookUrl`
- existing webhooks -> event `subscriptions`
- existing timers -> an external scheduler calling the deployed handler directly
- inbound delivery auth -> a `credentials` set with `WEBHOOK_*` keys bound via `subscription.credentials`
- external install provisioning -> setup-owned resources created by a registered setup endpoint

If the repo already has a worker command, wrap it behind an HTTPS endpoint rather than introducing a
new wrapper.

## Step 5: Add `warmhub/component.json`

Create the metadata file with the chosen identity.

## Step 6: Add `warmhub/manifest.json`

Write the full manifest. Include empty arrays/objects for unused sections. Point each subscription's
`webhookUrl` at the endpoint where the handler is (or will be) deployed.

The worker command itself (`npm run worker`, `bun src/index.ts`, `bash scripts/run.sh`, …) becomes
the handler your endpoint invokes per delivery — it is not named in the manifest.

For registered setup, configure `--setup-url`, optional `--uninstall-url`, `--allowed-callback`,
and optional `--credential-set-name` at registration. Add `--minted-tokens` when setup or runtime
tokens are required; it defaults off.

Declare `runtimeAccess` only for the deployed service's runtime reads/writes. If exposing
`cli.methods`, bind each method to a declared credential set and include `ComponentConfig` in
`runtimeAccess.writes`.

## Step 7: Add Or Adapt Handler Code

When the selected pattern uses a handler, build it to receive deliveries at the `webhookUrl`. Skip
this step for a seed-only package.

Make handler code:
- when a delivery credential is bound, verify it against raw body bytes before JSON parsing
- when none is bound, preserve and document the intentional unsigned-delivery boundary
- parse `event`, `repo`, `matchedOperations`, `callback_url`, and optional `repoSeq`
- deduplicate by idempotency key or `runId`, and use `callback_url` for accepted async work
- authenticate back to WarmHub with its deployment token or narrowly scoped runtime token

## Step 8: Add README Guidance

Document:
- install command
- credential setup commands
- trigger behavior
- output shapes / config things
- whether operators should run doctor or teardown as part of maintenance
- for each subscription, the bound credential or intentional unsigned-delivery boundary

## Step 9: Validate And Install

Run:

```bash
wh component validate ./repo
wh component register <component-name> --org <component-org> --manifest ./repo/warmhub/manifest.json
wh component install <component-org>/<component-name> --repo <org>/<repo>
wh component list --repo <org>/<repo>
wh component doctor <component-org>/<component-name> --repo <org>/<repo>
wh component update <component-org>/<component-name> --repo <org>/<repo>
```

If lifecycle commands fail with "component is not installed", re-run `wh component list --repo
<org>/<repo>` and pass the registered component ref shown there. Do not pass the reverse-DNS
manifest id unless that is exactly what the CLI lists.

</process>

<success_criteria>

- [ ] existing repo behavior is expressed through `component.json` + `manifest.json`
- [ ] existing scripts/commands were mapped directly where possible
- [ ] every subscription records either its bound manifest credential set or the intentional
      unsigned-delivery boundary
- [ ] setup-owned resources are created only by the registered setup endpoint
- [ ] no obsolete lifecycle shell scripts are required for install/doctor/teardown
- [ ] component install/doctor commands are documented
- [ ] `wh component validate` passes
- [ ] install succeeds against a test repo
- [ ] doctor output matches the intended component state

</success_criteria>
