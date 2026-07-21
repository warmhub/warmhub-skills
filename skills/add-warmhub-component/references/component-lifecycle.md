# Component Lifecycle

WarmHub components are declarative component packages.

A valid package is a git repository containing `warmhub/component.json` and
`warmhub/manifest.json`. Installation parses those files and reconciles resources through standard
WarmHub APIs.

## Repository Structure

```text
<component-repo>/
  warmhub/
    component.json          # required metadata
    manifest.json           # required declarative manifest
  actions/                  # optional webhook handler source (deployed by you)
  src/                      # optional TS/JS handler source
  skills/                   # optional bundled agent skills
  agents/                   # optional bundled agents
  README.md
```

There are no lifecycle shell hooks in the current component model.

## `component.json`

Use `component.json` for identity and discovery metadata.

```json
{
  "id": "com.acme.IncidentDigest",
  "name": "incident-digest",
  "version": "0.1.0",
  "description": "Summarize incident events into operator-facing digests",
  "author": "Acme",
  "tags": ["incidents", "ops"]
}
```

### Important fields

- `id` — required reverse-DNS ownership key, e.g. `com.acme.IncidentDigest`
- `name` — required human/CLI display slug, e.g. `incident-digest`
- `version` — required semver string
- `description`, `author`, `tags` — optional metadata

## `manifest.json`

The manifest declares all component-managed resources.

```json
{
  "$schema": "https://warmhub.dev/schema/component-manifest.v1.json",
  "component": {
    "id": "com.acme.IncidentDigest",
    "name": "incident-digest",
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

### Manifest sections

- `component` — must match `component.json`
- `shapes` — shapes to create or ensure exist
- `credentials` — credential sets the component expects (e.g. `WEBHOOK_*` keys for delivery auth)
- `subscriptions` — event triggers that deliver to a `webhookUrl` you operate; external schedulers call handlers directly
- `seeds` — initial things to create on install
- `health` — passive requirements checked by `wh component doctor`
- `teardown` — pause/delete behavior for managed subscriptions

## Shared Infrastructure

The installer automatically ensures two shared infra shapes:

- `ComponentInstall` — install tracking records, one thing per component id
- `ComponentConfig` — shared config bucket for component-owned config things

Guidance:
- do **not** declare `ComponentInstall` in `manifest.shapes`
- only use `ComponentConfig` when you need config things like
  `ComponentConfig/incident-digest`
- if you seed config, seed a `thing` under `ComponentConfig` instead of inventing a new
  lifecycle mechanism

## Identity And Ownership

The component `id` is the ownership key in the manifest and install record.

Resources created by the installer are tagged with that `componentId`, and component-owned writes are
protected from unrelated callers. Treat the `id` as durable; change `version` frequently, but change
`id` only for a true ownership break.

CLI lifecycle commands use the registered component ref `<org>/<name>`, not the reverse-DNS manifest
id. For example, Veritas installs as `warmhub/veritas` even though its manifest id is different.
After install, run `wh component list --repo <org>/<repo>` and pass the listed ref to
`doctor`, `view`, `update`, and `teardown`.

Example:

```bash
wh component doctor acme/incident-digest --repo acme/platform
```

## Install / Update / Doctor / Teardown

### Validate

```bash
wh component validate ./my-component
```

Checks:
- JSON schema validity
- cross-references between subscriptions, credentials, and shapes
- reverse-DNS component id format
- consistency between `component.json` and `manifest.json`
- subscription `webhookUrl` and credential-set references

### Install

```bash
wh component register incident-digest --org acme --manifest ./my-component/warmhub/manifest.json
wh component install acme/incident-digest --repo acme/platform
wh component list --repo acme/platform
```

Install behavior:
- ensures shared infra exists
- writes/updates `ComponentInstall/<component-id>`
- creates declared shapes and seeds
- creates declared credential sets
- creates subscriptions pointing at their declared `webhookUrl`, binding credentials where declared
- computes component state (`ready`, `credentials-required`, `degraded`, etc.)

### Update

```bash
wh component update acme/incident-digest --repo acme/platform
```

Update uses conservative reconcile semantics:
- add missing declared resources
- update mutable declared resources
- never auto-delete undeclared shapes or things
- surface drift through doctor findings instead of silently removing state

### Doctor

```bash
wh component doctor acme/incident-digest --repo acme/platform
```

Doctor checks:
- health requirements in `manifest.health.requires`
- credential readiness
- subscription presence / active state
- ownership mismatches
- missing or drifted declared resources

### Teardown

```bash
wh component teardown acme/incident-digest --repo acme/platform
```

Teardown applies `manifest.teardown` policy. In practice, `pause` is the common safe default for
managed subscriptions.

## Webhook URL Rules For Subscriptions

If `manifest.subscriptions` is empty, a seed-only component needs no runtime endpoint.

If the component declares subscriptions, each must point at a `webhookUrl` that is reachable when
deliveries fire. WarmHub validates the URL at create time and again at delivery time:
- HTTPS only — no `http://`
- public host — no localhost, private, link-local, or other reserved IP ranges
- allowed ports (`80`, `443`, `8443`) and a canonical hostname

Deploy the handler yourself (any HTTPS service); the component repo can hold its source under
`actions/` or `src/`, but the running endpoint is hosted by you.

To authenticate inbound deliveries, declare a credential set with `WEBHOOK_*` keys and bind it via
`subscriptions[].credentials`.

## Health / Teardown Defaults

Recommended starting point:

```json
{
  "health": {
    "requires": {
      "shapes": ["IncidentEvent", "IncidentDigest"],
      "things": ["ComponentConfig/incident-digest"],
      "subscriptions": ["incident/process-event"]
    }
  },
  "teardown": {
    "subscriptions": {
      "onDisable": "pause"
    }
  }
}
```

Use the narrowest possible health contract: only require resources the component genuinely depends
on.
