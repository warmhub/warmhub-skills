---
name: add-warmhub-component
description: >
  Add or install a WarmHub component on an existing or newly built WarmHub repo. Use when wrapping a
  repo as a component, installing published components such as Veritas, designing
  `warmhub/component.json` and `warmhub/manifest.json`, wiring event or cron subscriptions, choosing
  seed-only versus webhook-handler packaging, configuring credential sets for inbound delivery auth,
  or validating install, doctor, update, and teardown behavior. Trigger phrases: "add warmhub
  component", "install Veritas", "with Veritas", "componentize this repo", "component manifest",
  "wh component install", "wh component doctor".
---

# Add WarmHub Component

<objective>

Guide the user through adding a complete, installable WarmHub component package to a repo produced
by a builder stage or supplied by the user.

A WarmHub component is a git repository containing a `warmhub/` directory with:
- `component.json` — metadata and stable identity
- `manifest.json` — declarative resource definitions

Installing a component parses the manifest and creates or reconciles shapes, credential sets,
subscriptions, seeds, and install tracking records via standard WarmHub APIs. No `install.sh`,
`teardown.sh`, or `health.sh` lifecycle scripts are executed.

The skill supports two entry points:
- componentizing an existing repo
- building a new component from a natural-language design

Both paths should end with the same output: a repo that passes `wh component validate`, is
registered when it needs installation, installs cleanly with `wh component install <org>/<name>`,
and reports healthy via `wh component doctor`.

</objective>

## Inputs

Accept one of:

- a project-state manifest with repo design, ingestion plan, and build output
- a local path or GitHub URL for an existing repo
- an existing published component id/name to install on a target repo, such as `warmhub/veritas`
- a natural-language component design with target WarmHub repo identity

When starting from an existing repo, compose `discover-warmhub-repo` first if shapes, subscriptions,
credentials, install state, or sensitivity are unknown.

## Stage Rules

- Package and reconcile component resources; do not redesign the underlying repo model unless a
  manifest inconsistency blocks install.
- For an existing published component, install it with the supported `wh component install
  <org>/<name>` command, run `wh component list --repo <org>/<repo>`, then run `wh component doctor`
  with the installed component ref shown by the list output. Inspect the
  shapes/subscriptions/resources it added and update the manifest. Do not fake component behavior
  with local fields.
- Prefer the smallest viable component pattern: seed-only, event webhook, cron webhook, or mixed.
- Preserve existing repo behavior while making component metadata and manifest state explicit.
- Update the project-state manifest with component identity, resources declared, validation status,
  and remaining deployment or credential work when a manifest is present.
- Keep private paths, tokens, and local-only URLs out of generated user-facing instructions.

<quick_start>

1. Describe the component or point to an existing repo.
2. Choose the simplest viable component pattern from `references/example-components.md`.
3. Design shapes, credentials, subscriptions, seeds, health, and teardown policy.
4. Write `warmhub/component.json` and `warmhub/manifest.json`.
5. Build the webhook handler and point each subscription's `webhookUrl` at its deployed endpoint.
6. Validate with `wh component validate`, register unpublished packages, then install and
   doctor-test by registered component ref.

</quick_start>

<interview_mode>

When the component idea is vague, there are several plausible architectures, or the user wants to
be grilled, stop scaffolding and interview first.

- Ask one high-leverage question at a time.
- Give a recommended default answer with every question.
- Resolve parent decisions before child details.
- Skip branches that stop mattering once an earlier choice is made.
- If the main uncertainty is the metric or decision loop, use `find-self-verifying-objectives`
  before freezing shapes.

Walk the tree in this order:
1. Entry point: componentize an existing repo or build from scratch
2. Pattern: seed-only, event-driven, cron-driven, or mixed
3. Trigger shape, output shape, and config surface
4. Handler runtime: bash, bun/node, or an existing service command
5. Handler hosting: where the webhook endpoint runs and its public HTTPS URL
6. Credential shape: none, or one credential set for inbound delivery auth / handler secrets
7. Health checks, teardown policy, and install/update workflow
8. Component identity: reverse-DNS `id`, human `name`, versioning

After the tree is resolved, summarize the approved design and continue with the chosen workflow.

</interview_mode>

<component_patterns>

| Pattern | Best fit | What the manifest usually contains |
|--------|----------|-------------------------------------|
| Seed-only | Shapes, config, or starter data with no runtime logic | `shapes`, `seeds`, `health` |
| Event-driven webhook | React to writes on a shape via a deployed handler | `shapes`, `subscriptions` (event trigger), optional `credentials` |
| Secret-backed webhook | Handler delivery needs inbound auth or the handler holds secrets | `credentials`, `subscriptions.credentials` |
| Cron / mixed | Scheduled syncs, maintenance jobs, or several triggers | multiple `subscriptions` (cron + event), `health`, `teardown` |

Choose the lowest-complexity pattern that satisfies the requirement.

</component_patterns>

<essential_principles>

**Components are declarative.** Behavior is defined by `warmhub/manifest.json`, not by lifecycle
shell scripts. The installer reads the manifest and creates or reconciles declared resources.

**`component.json` and `manifest.json` must agree.** The `component.id`, `component.name`, and
`component.version` values in `manifest.json` must match `warmhub/component.json` exactly.

**Use reverse-DNS component IDs in manifests.** Example: `com.acme.IncidentDigest`. This is the
ownership and install-tracking key inside `component.json`, `manifest.json`, and
`ComponentInstall/<id>`. The human-facing `name` should usually be a kebab-case slug like
`incident-digest`. Current CLI lifecycle commands use the registered component ref `<org>/<name>`,
such as `warmhub/veritas`; after install, run `wh component list --repo <org>/<repo>` and pass the
listed ref to `doctor`, `view`, `teardown`, and `update`.

**Subscriptions deliver to a webhook URL you operate.** Each subscription declares a `webhookUrl` —
a public HTTPS endpoint that receives the delivery POST and does the work. The platform no longer
runs your code in a managed container; you deploy the handler yourself and point `webhookUrl` at it.
The component repo can hold the handler source (e.g. an `actions/` directory), but the running
endpoint is hosted by you. The webhook URL must be public HTTPS — no localhost or private IPs.

**Inbound deliveries are authenticated with a credential set.** Declare a credential set with
`WEBHOOK_*` keys and bind it through `subscription.credentials` so the platform attaches auth
headers (bearer token, API key, or HMAC signature) to each delivery and your handler can verify the
request came from WarmHub. There is no manifest `actions` array and no `source.auth` clone step.

**One credential binding per subscription.** If a handler needs several secrets, collapse them into
one credential set rather than listing multiple sets in `subscription.credentials`.

**Do not self-trigger.** If an event subscription watches `InputShape`, do not write new things back
into `InputShape` from the same action unless you intentionally want a loop. Prefer separate input
and output shapes.

**Treat shared infra as built-in.** `ComponentInstall` and `ComponentConfig` are shared system
infrastructure. Do not declare `ComponentInstall` in `manifest.shapes`. Use `ComponentConfig`
only when you need config things such as `ComponentConfig/<component-name>`.

**Health is passive in v1.** Declare required shapes, things, and subscriptions in
`manifest.health.requires`, then rely on `wh component doctor` to compute state.

**Reconcile is conservative.** Reinstall/update adds missing declared resources and updates mutable
resource configuration, but does not auto-delete undeclared shapes or things. Surface drift instead
of assuming uninstall semantics.

</essential_principles>

<intake>

**What would you like to build?**

1. **Componentize an existing repo** — wrap a repo you already have as a WarmHub component package
2. **Build a new component** — design and scaffold a component from a problem description

Provide either:
- a GitHub URL or local path to an existing repo
- a natural-language description of what the component should do

If the request is underspecified, ask one question at a time instead of routing immediately.

</intake>

<routing>

| Response | Workflow |
|----------|----------|
| URL, path, `existing`, `wrap`, `componentize` | `workflows/componentize-repo.md` |
| description, `new`, `create`, `build`, `from scratch` | `workflows/build-component.md` |

**After reading the workflow, follow it exactly.**

</routing>

<quick_reference>

**Component repo structure**

```text
my-component/
  warmhub/
    component.json
    manifest.json
  actions/                # optional webhook handler source (deployed by you)
  src/                    # optional TS/JS handler code
  skills/                 # optional bundled skills
  agents/                 # optional bundled agents
  README.md
```

**Minimal metadata**

```json
{
  "id": "com.acme.MyComponent",
  "name": "my-component",
  "version": "0.1.0",
  "description": "What the component does"
}
```

**Minimal manifest skeleton**

```json
{
  "$schema": "https://warmhub.dev/schema/component-manifest.v1.json",
  "component": {
    "id": "com.acme.MyComponent",
    "name": "my-component",
    "version": "0.1.0"
  },
  "shapes": [],
  "credentials": [],
  "subscriptions": [],
  "seeds": [],
  "health": {},
  "teardown": {}
}
```

**Core commands**

```bash
wh component validate ./my-component
wh component register my-component --org acme --manifest ./my-component/warmhub/manifest.json
wh component install acme/my-component --repo org/repo
wh component list --repo org/repo
wh component doctor acme/my-component --repo org/repo
wh component teardown acme/my-component --repo org/repo
wh component update acme/my-component --repo org/repo
```

</quick_reference>

<reference_index>

All in `references/`:
- `component-lifecycle.md` — package structure, manifest contract, lifecycle semantics, ownership
- `action-patterns.md` — seed-only, event webhook, cron, and secret-backed handler patterns
- `action-container-credentials.md` — credential declarations, inbound delivery auth, binding
- `shape-design.md` — shape naming, config seeds, input/output separation
- `subscription-wiring.md` — event vs cron triggers, health, teardown, naming
- `example-components.md` — proven component pattern selection guide

</reference_index>

<workflows_index>

| Workflow | Purpose |
|----------|---------|
| `componentize-repo.md` | Wrap an existing repo as a declarative WarmHub component |
| `build-component.md` | Design and scaffold a new component from scratch |

</workflows_index>

<success_criteria>

A good component package:
- has `warmhub/component.json` and `warmhub/manifest.json`
- uses a reverse-DNS component `id` and matching manifest `component` block
- declares only the shapes, credentials, subscriptions, seeds, health checks, and teardown
  policy it actually needs
- points each subscription at a public HTTPS `webhookUrl` and binds a `WEBHOOK_*` credential set via
  `subscription.credentials` when inbound delivery auth is needed
- separates trigger shapes from output shapes unless a loop is explicitly intended
- passes `wh component validate ./<dir>`
- installs successfully with `wh component install <org>/<name>`
- reports sane state via `wh component doctor`
- includes a README that explains install, credentials, action behavior, and expected outputs

</success_criteria>

## Output Shape

Return:

- component id, name, version, repo path, and target WarmHub repo
- component pattern chosen and why
- resources declared in `warmhub/manifest.json`
- credential sets, subscriptions, health checks, and teardown policy
- validation, install, doctor, update, or teardown commands run
- manifest fields updated, or exact fields the user should add
- remaining deployment, credential, or repo-discovery work

## Next steps

After the component validates and installs, choose the next move:

- **Build a collector** — `Use build-warmhub-collector if the project needs human/mobile writes.`
- **Build a display** — `Use build-warmhub-display if the project needs a read surface.`
- **Share handoff** — provide README, install, doctor, caveat, and demo notes to reviewers.
- **Revise ingestion** — `Use plan-warmhub-ingestion if component constraints change data flow.`

End with:

```text
Next step:
- Recommended: <one next stage or action>
- Alternatives: <short list of valid next stages/actions>
- Manifest updated: <path or not updated>
- Ready for: <stage-name or human decision>
- Blocking questions: <none or concise list>
```
