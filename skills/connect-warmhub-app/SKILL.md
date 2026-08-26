---
name: connect-warmhub-app
description: >
  Wire an app, report, or notebook surface to WarmHub data. Use when a display, collector, report,
  notebook, or app needs Python or TypeScript SDK setup, WARMHUB_API_URL, WARMHUB_REPO,
  server-side token handling, a
  one-fact connection probe, sharing-mode decisions, token-safety rules, or source attribution.
  Trigger phrases: "connect this app to WarmHub", "wire WarmHub SDK", "add WarmHub auth",
  "prove one WarmHub fetch", "add source attribution", "connect a WarmHub MCP agent".
---

# Connect WarmHub App

## Objective

Establish the shared WarmHub app or agent substrate before a display or collector skill adds
surface-specific behavior.

This skill stops after an app can fetch one WarmHub fact safely, or an MCP-capable agent is connected
to the global MCP endpoint, and the auth/sharing/attribution decisions are recorded.

## Inputs

Require:

- target WarmHub repo identity or a repo discovery summary, unless this is a global MCP connection
- app/runtime target: server app, Worker, notebook, static build, MCP-capable agent, or unknown
- intended audience and sensitivity classification
- optional project-state manifest path

If repo facts are unknown for a repo-specific app, compose `discover-warmhub-repo` first when
available. A global MCP connection can connect first and discover visible repositories through its
catalog.

## Workflow

For an MCP-capable agent, confirm anonymous or authenticated access, configure the global MCP branch
in [app-connection.md](references/app-connection.md), verify initialization and discovery, update the
manifest if supplied, and stop. Do not install an SDK or continue through the app workflow unless the
project also has a direct app read path.

For an app, report, notebook, display, or collector substrate:

1. Confirm the sharing mode before choosing token plumbing.
2. Choose the first-class SDK for the runtime: `warmhub` for Python and `@warmhub/sdk-ts` for
   TypeScript apps.
3. Configure non-secret repo settings and a server-side token source.
4. Add the smallest possible one-fact probe before building a display or write flow.
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
- for MCP: endpoint plus initialization, discovery, and auth result
- for an app: env/config variables and one-fact probe command, route, or notebook cell
- proof that the probe ran or agent connected, or the exact blocker
- source attribution placement for human-facing app outputs
- manifest update path if applicable
- follow-up work for the display or collector stage, when applicable

## Success Criteria

- No token reaches browser code, generated static files, notebook output, prompts, or committed
  source.
- For apps, `WARMHUB_REPO` and `WARMHUB_API_URL` are config, PATs stay in secrets, and one real read
  succeeds before surface-specific work continues.
- An MCP agent uses the global `POST /mcp` endpoint; repository locators stay tool arguments.
- Human-facing app outputs link back to the WarmHub source unless repo identity is intentionally
  hidden.

## References

- [app-connection.md](references/app-connection.md) — SDK setup, env model, and probe patterns.
- [auth-and-sharing.md](references/auth-and-sharing.md) — sharing modes and token-safety rules.
- [source-attribution.md](references/source-attribution.md) — source link target, placement, and validation.

## Next steps

After an app substrate is connected, choose the next move:

- **Build a display** — `Use build-warmhub-display to add the selected read surface.`
- **Build a collector** — `Use build-warmhub-collector to add the write path and provenance model.`
- **Share demo** — provide the demo URL, attribution, caveats, and reproduce steps.

After an MCP-only connection, return the verified connection result and the next repo-specific agent
task, if one was requested.

End with:

```text
Next step:
- Recommended: <one next stage or action>
- Alternatives: <short list of valid next stages/actions>
- Manifest updated: <path or not updated>
- Ready for: <stage-name or human decision>
- Blocking questions: <none or concise list>
```
