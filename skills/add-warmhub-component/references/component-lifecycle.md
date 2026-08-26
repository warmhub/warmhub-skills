# Component Lifecycle

A component package has `warmhub/component.json` and `warmhub/manifest.json`. Installation resolves
the registered manifest, creates manifest-provisioned resources, and records the install. It does
not run shell hooks, local action scripts, managed containers, or cron jobs.

## Identity and commands

- `component.id` is the reverse-DNS manifest identity and names `ComponentInstall/<id>`. The
  registered-component UUID is the internal ownership key for shapes and subscriptions.
- `component.name` is unique in the target repo and resolves component CLI methods.
- Install, update, doctor, and teardown use the registered `<org>/<name>` ref. Use
  `wh component list --repo <org>/<repo>` to find it.
- Invoke a declared operator method with `wh component exec <component-name> <method> --repo
  <org>/<repo>`; `wh <component-name> <method>` is shorthand when the name does not shadow a
  built-in CLI command.

Both files must have the same id and name (validated); keep version aligned by convention.

## Manifest provisioning and setup

`provisioning: "manifest"` is the default for shapes, credential sets, and subscriptions. The
installer creates those resources; users populate declared credential keys afterward.

`provisioning: "setup"` is for a registered component with a setup endpoint. The installer skips
those resources, then invokes the registered endpoint. When the registration enables minted tokens,
the setup payload carries a five-minute `setup_token` scoped only to current setup-owned resource
names and permitted credential bindings. It may create or reconcile only what the current manifest
declares. Do not cache that token.

Declare the optional `runtimeAccess` only for shapes the running external service must read or write.
It controls the optional long-lived `runtime_token`; no declared access means no runtime token. For
`cli.methods`, reference a declared credential set and include `ComponentConfig` in
`runtimeAccess.writes`; setup uses it to store the CLI endpoint for that install.

Setup is called after manifest provisioning even if that phase is degraded. `wh component update`
resolves the latest published manifest and replays setup with a fresh token. A replay can reconcile
the declared setup resources in place, but cannot widen the manifest contract: subscription trigger,
origin, fallback presence, shape fields/description, credential key names, cross-repo source, and
trace-reentry rules remain constrained by the manifest.

## Install, update, and doctor

```bash
wh component validate ./my-component
wh component install acme/my-component --repo acme/platform
wh component update acme/my-component --repo acme/platform
wh component doctor acme/my-component --repo acme/platform
```

Install ensures shared `ComponentInstall` and `ComponentConfig` infrastructure, records the install,
then applies declared shapes, credential sets, subscriptions, and seeds. Do not declare either shared
shape yourself.

Update is reconciliation, not cleanup: it adds missing resources, creates missing seeds, replays
registered setup, and releases shapes dropped from the newer manifest. Seeding is create-only: an
existing seed thing is never revised on update or reinstall. It does not delete existing subscription
rows or seed data. A paused subscription stays paused after update or reinstall; only the operator
may resume or recreate it.

Doctor checks the installed manifest snapshot, not local files: declared resource existence/activity,
credential-key readiness, shape drift, ownership, and available version. Missing credential values
are findings but do not by themselves change health state. Ownership conflicts and missing/inactive
resources make the component degraded; all paused subscriptions make it paused.

## Ownership and terminal teardown

Shapes owned by a component are protected as schema; users can still create data under them. Update
or teardown releases shape ownership without deleting shape rows or data, so a later install can
adopt an unowned same-name shape.

Subscription ownership is different: a terminal teardown pauses the component's subscriptions but
does not release or delete their rows. Subscriptions are never adopted, whether unowned or owned by
another component; coordinate removal/renaming with its owner or use a new name.

```bash
wh component teardown acme/my-component --repo acme/platform
```

Teardown is terminal and non-destructive. It pauses subscriptions, dispatches the optional uninstall
callback while its runtime token is still live, then revokes the install's component tokens,
releases owned shapes, and marks the install uninstalled. It preserves shapes, seeds, subscription
rows, and the install record. Reinstall revives the record and reclaims eligible shapes, but never
resumes paused subscriptions or restarts a handler or external scheduler.
