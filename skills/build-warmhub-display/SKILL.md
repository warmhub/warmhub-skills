---
name: build-warmhub-display
description: >
  Build a read-only display, report, notebook, or analysis surface for WarmHub data. Use when a
  project manifest, RepoDesignSummary, existing WarmHub repo, or repo fact summary needs an egress
  surface such as Observable Framework, Cloudflare Workers, Vercel plus Supabase, or an IPython
  notebook. Trigger phrases: "build warmhub display", "show WarmHub data", "create WarmHub
  dashboard", "choose display surface", "analyze WarmHub data", "build a frontend for this repo".
---

# Build WarmHub Display

## Objective

Choose and scaffold the smallest useful read surface for WarmHub data. This stage owns display and
analysis concerns only: surface selection, display-specific files, validation, demo/readiness notes,
and manifest handoff.

Do not design repo shapes, plan ingestion, build collectors, install components, or duplicate shared
repo discovery, auth, token-safety, or attribution guidance.

## Inputs

Accept any combination of:

- project-state manifest with `warmhubRepo`, `repoDesignSummary`, `ingestion`, and `display`
- repo fact summary from `discover-warmhub-repo`
- app connection summary from `connect-warmhub-app`
- WarmHub `org/repo` plus display intent
- user constraints: audience, sensitivity, hosting preference, update cadence, interactivity, and
  persistence needs

If repo facts are missing for an existing repo, compose `discover-warmhub-repo` first. If SDK/auth,
token boundary, one-fact probe, or source attribution is not settled, compose `connect-warmhub-app`
before adding display-specific UI or notebook code. If those skills are unavailable, gather only the
minimal facts needed for this stage and record that a fallback path was used.

If the manifest describes a new WarmHub repo but `warmhubRepo.repoState` is not live/verified, route
back to `build-warmhub-repo` instead of building only against local JSON. If the display depends on a
component/runtime such as Veritas, require the component to be installed and health-checked before
presenting its outputs as authoritative.

## Workflow

1. Read the manifest or repo summary. Do not re-ask repo-design facts already present in
   `repoDesignSummary`.
2. Confirm display intent only where missing: audience, sharing mode, sensitivity, desired surface,
   interaction depth, refresh cadence, and persistence needs.
3. Use [references/decision-rubric.md](references/decision-rubric.md) to score Notebook,
   Observable, Cloudflare Workers, and Vercel plus Supabase.
4. Choose the smallest read contract with [references/read-patterns.md](references/read-patterns.md):
   static/one-shot is the default; authenticated pagination is for complete datasets; incremental
   projection is opt-in only for a long-lived derived read model.
5. Load only the winning branch reference, or the top two when scores are close:
   - [references/observable.md](references/observable.md)
   - [references/cloudflare-workers.md](references/cloudflare-workers.md)
   - [references/vercel-supabase.md](references/vercel-supabase.md)
   - [references/ipython-notebook.md](references/ipython-notebook.md)
6. Scaffold or plan the selected display surface using the branch reference and the app substrate
   from `connect-warmhub-app`.
7. Prove the surface reads real WarmHub data, renders something concrete, and keeps secrets out of
   browser bundles, static output, notebooks, committed files, and page chrome.
8. Update the manifest `display` block with selected surface, local path, demo URL when known,
   validation status, and blockers.
9. End with the standard next-step block.

Use the runtime's user-input tool for path-changing display decisions. Put the recommended choice
first, offer 2-4 concrete choices with tradeoffs, and ask one question at a time. If no tool is
available, ask the same question in numbered prose.

## Output Shape

Return:

- recommended display surface and score table
- rationale tied to repo facts, sensitivity, audience, and user constraints
- SDK/runtime choice and read contract, including whether a complete authenticated scan, stored View,
  or incremental projection is actually needed
- files scaffolded or exact implementation plan
- WarmHub app connection and attribution status
- validation commands run and results, including render/probe evidence
- manifest fields updated, or exact JSON patch the user should apply
- remaining deployment, data-safety, or UX work

## Success Criteria

- The chosen surface matches the decision rubric and user constraints.
- The stage composes `discover-warmhub-repo` and `connect-warmhub-app`, or records a minimal
  fallback with the facts gathered.
- The display reads real WarmHub data before decorative UI work continues.
- Anonymous public reads stay within the documented API cap; complete datasets use authenticated reads
  and ordinary SDK iterator/all helpers.
- Incremental change scans are used only for a long-lived projection, and the terminal consumer
  `repoSeq` is saved only after a successful exhausted scan.
- Component-backed claims are read from component-owned outputs, not local lookalike fields, unless
  the UI explicitly labels them as pending/local estimates.
- Human-facing outputs include WarmHub source attribution unless the repo identity is intentionally
  hidden.
- No secrets or private raw data are exposed in browser code, static output, notebooks, committed
  files, or visible page chrome.
- The answer ends with a next-step block.

## References

- [decision-rubric.md](references/decision-rubric.md) — surface scoring and tie-breakers.
- [read-patterns.md](references/read-patterns.md) — SDK choice, pagination, grants, and optional
  incremental projection rules.
- [observable.md](references/observable.md) — Observable Framework or notebook-style display branch.
- [cloudflare-workers.md](references/cloudflare-workers.md) — lightweight edge display/API branch.
- [vercel-supabase.md](references/vercel-supabase.md) — durable authenticated app branch.
- [ipython-notebook.md](references/ipython-notebook.md) — local analysis and reproducible report branch.

## Next steps

After the display is scaffolded and validated, choose the next move:

- **Iterate display** — refine the chosen surface with real content, UX, and visual checks.
- **Add live updates** — `Use add-warmhub-component if the display needs refresh or projection automation.`
- **Build a collector** — `Use build-warmhub-collector if users also need to submit data.`
- **Share demo** — hand reviewers the demo URL, caveats, source attribution, and reproduce notes.

End with:

```text
Next step:
- Recommended: <one next stage or action>
- Alternatives: <short list of valid next stages/actions>
- Manifest updated: <path or not updated>
- Ready for: <stage-name or human decision>
- Blocking questions: <none or concise list>
```
