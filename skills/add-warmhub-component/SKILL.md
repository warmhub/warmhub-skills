---
name: add-warmhub-component
description: >
  Add or install a WarmHub component on an existing or newly built WarmHub repo. Use when wrapping a
  repo as a component, designing `warmhub/component.json` and `warmhub/manifest.json`, wiring event
  subscriptions or external schedulers, configuring delivery credentials, or validating install,
  update, doctor, and teardown behavior. Trigger phrases: "add warmhub component", "componentize
  this repo", "component manifest", "wh component install", "wh component doctor".
---

# Add WarmHub Component

<objective>

Build a declarative, installable component package. A package contains `warmhub/component.json` and
`warmhub/manifest.json`; the manifest declares resources and the CLI reconciles them. Do not use
lifecycle shell scripts.

</objective>

<inputs>

Accept a repo path/URL, a published component ref, or a component design. If the target repo's
shapes, subscriptions, credentials, or install state are unknown, use `discover-warmhub-repo` first.

</inputs>

<routing>

- Existing repo, path, URL, or `componentize` request: follow `workflows/componentize-repo.md`.
- New component design: follow `workflows/build-component.md`.
- Published component ref: install with `wh component install <org>/<name>`, then list and doctor the
  target repo; do not recreate its behavior locally.

</routing>

<core_contract>

- Use a reverse-DNS manifest `id`, a kebab-case `name`, and matching id/name/version in both files.
  Install and lifecycle commands use the registered `<org>/<name>` ref; component methods resolve by
  installed `name`.
- Keep the manifest declarative. `provisioning: "manifest"` is the default. Registered components
  may use `provisioning: "setup"` resources only when their setup endpoint creates them with the
  short-lived setup token. See `references/component-lifecycle.md`.
- `runtimeAccess` is the least-privilege scope for an optional minted runtime token. Declare `cli`
  only for operator-facing methods; non-empty `cli.methods` requires `runtimeAccess.writes` to include
  `ComponentConfig`.
- Subscriptions call a public HTTPS handler that the component author operates. Never imply that
  WarmHub runs a container, a local script, or a cron job. Scheduled work uses an external scheduler
  calling that handler.
- A handler must be idempotent and treat `repoSeq` as optional. When a delivery credential is bound,
  verify it against raw body bytes before parsing; make the delivery-auth decision explicit when a
  subscription is unbound. The Webhook and Credentials references define payload, dual-signature,
  retry, fallback, and credential-loss behavior.
- Do not self-trigger: subscribe to an input shape and write results to a distinct output shape unless
  a loop is intentional.
- Shared `ComponentInstall` and `ComponentConfig` shapes are system-managed. Do not declare them as
  component shapes; seed a `ComponentConfig/<component-name>` thing only when configuration is needed.

</core_contract>

<workflow>

1. Choose the smallest pattern: seed-only, event webhook, secret-backed webhook, or externally
   scheduled handler. See `references/example-components.md`.
2. Map existing shapes, seeds, subscriptions, credential sets, and handler endpoint into the manifest.
   Keep handler source in the repo only if it is useful to the operator; deployment remains external.
3. For registered setup, declare setup-owned resources and configure the registration's setup endpoint
   before assuming minted tokens. For a normal component, leave resources manifest-provisioned.
4. Document install, credential population, handler deployment, trigger/output behavior, and any
   operator-facing CLI method.
5. Validate, register, install, list, and doctor-test using the commands below. For a manifest change,
   publish the newer version and run `wh component update`; do not treat reinstall as deletion.

</workflow>

<commands>

```bash
wh component validate ./my-component
wh component register my-component --org acme --manifest ./my-component/warmhub/manifest.json
wh component install acme/my-component --repo acme/platform
wh component list --repo acme/platform
wh component doctor acme/my-component --repo acme/platform
wh component update acme/my-component --repo acme/platform
wh component teardown acme/my-component --repo acme/platform
wh component exec my-component <method> --repo acme/platform
```

</commands>

<references>

- `references/component-lifecycle.md` — provisioning, setup/runtime tokens, CLI methods, reconcile,
  doctor, ownership, and terminal teardown
- `references/action-patterns.md` — handler patterns, payload contract, idempotency, callbacks, and
  delivery outcomes
- `references/action-container-credentials.md` — credential binding, dual signing, rotation, and
  credential revoke/delete/unbind behavior
- `references/subscription-wiring.md` — event subscriptions, fallback, doctor behavior, and non-resurrection
- `references/shape-design.md` — input/output shapes and config
- `references/example-components.md` — pattern selection

</references>
