---
name: connect-warmhub-app
description: >
  Wire a TypeScript app or notebook surface to WarmHub data. Use when a display, collector, report,
  notebook, or app needs SDK setup, WARMHUB_API_URL, WARMHUB_REPO, server-side token handling, a
  one-fact connection probe, sharing-mode decisions, token-safety rules, or source attribution.
  Trigger phrases: "connect this app to WarmHub", "wire WarmHub SDK", "add WarmHub auth",
  "prove one WarmHub fetch", "add source attribution".
---

# Connect WarmHub App

## Objective

Establish the shared WarmHub app substrate before a display or collector skill adds surface-specific
behavior.

This skill stops after the app can fetch one WarmHub fact safely and the auth/sharing/attribution
decisions are recorded.

## Inputs

Require:

- target WarmHub repo identity or a repo discovery summary
- app/runtime target: server app, Worker, notebook, static build, or unknown
- intended audience and sensitivity classification
- optional project-state manifest path

If repo facts are unknown, compose `discover-warmhub-repo` first when available. If it is unavailable,
collect the minimum repo identity, shape names, sensitivity, and attribution facts inline.

## Workflow

1. Confirm the sharing mode before choosing token plumbing.
2. Install or verify `@warmhub/sdk-ts` for TypeScript runtimes.
3. Configure non-secret repo settings and a server-side token source.
4. Add the smallest possible one-fact probe before building UI or write flows.
5. For runtimes where SDK compatibility is unproven, use a direct server-side HTTP probe and record
   SDK validation as follow-up.
6. Add visible WarmHub source attribution to human-facing pages, reports, and notebooks unless the
   user says the repo identity must stay hidden.
7. Update the project-state manifest if supplied.

Use:

- [app-connection.md](references/app-connection.md) for SDK/env/probe guidance.
- [auth-and-sharing.md](references/auth-and-sharing.md) for public/private mode selection and token
  safety.
- [source-attribution.md](references/source-attribution.md) for backlink placement.

## Output Shape

Return:

- selected sharing mode and token boundary
- env/config variables added or required
- one-fact probe command, route, or notebook cell
- proof that the probe ran, or the exact blocker
- source attribution placement
- manifest update path if applicable
- follow-up work for the display or collector stage

## Success Criteria

- No token reaches browser code, generated static files, notebook output, or committed source.
- `WARMHUB_REPO` and `WARMHUB_API_URL` are config, while WarmHub PATs stay in secrets.
- The app proves one real WarmHub read before surface-specific work continues.
- Human-facing outputs link back to the WarmHub source unless repo identity is intentionally hidden.

## References

- [app-connection.md](references/app-connection.md) — SDK setup, env model, and probe patterns.
- [auth-and-sharing.md](references/auth-and-sharing.md) — sharing modes and token-safety rules.
- [source-attribution.md](references/source-attribution.md) — source link target, placement, and validation.

## Next steps

Now that the app substrate is connected, choose the next move:

- **Build a display** — `Use build-warmhub-display to add the selected read surface.`
- **Build a collector** — `Use build-warmhub-collector to add the write path and provenance model.`
- **Share demo** — provide the demo URL, attribution, caveats, and reproduce steps.

End with:

```text
Next step:
- Recommended: <one next stage or action>
- Alternatives: <short list of valid next stages/actions>
- Manifest updated: <path or not updated>
- Ready for: <stage-name or human decision>
- Blocking questions: <none or concise list>
```
