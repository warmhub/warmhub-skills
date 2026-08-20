---
name: discover-warmhub-repo
description: >
  Read and summarize an existing WarmHub repo without mutating it. Use when a user has a WarmHub
  org/repo and needs shape inventory, thing and assertion counts, recent commit cadence, sensitivity
  signals, source attribution context, or a repo fact summary for another WarmHub builder stage.
  Trigger phrases: "discover this WarmHub repo", "inspect repo facts", "summarize WarmHub shapes",
  "what is in this WarmHub repo", "connect a stage to an existing repo".
---

# Discover WarmHub Repo

## Objective

Produce a read-only repo fact summary that downstream skills can consume without re-asking basic
WarmHub repo questions.

Do not create repos, update shapes, write assertions, install components, or scaffold apps.

## Inputs

Require a WarmHub repo identity:

- `org/repo` from the user, app config, manifest, or prior stage output
- optional project-state manifest path
- optional user statement about audience, sensitivity, or intended use

If no repo exists yet, stop and hand off to repo design or the coordinator.

## Workflow

1. Resolve the repo identity and run `wh prime` if repo context is stale.
2. Read repo metadata, shape inventory, current things/assertions, and recent commits.
3. Classify shape roles: durable things, assertions, reporting periods, QC artifacts, config, or
   unknown.
4. Estimate counts by shape. Page when the first response is not representative.
5. Infer update cadence and read/write expectations from commits, shape names, and user context.
6. Identify sensitivity and attribution signals. Ask only if repo identity or data visibility is
   ambiguous.
7. Return a compact fact summary and update the manifest if one was supplied.

Use [references/discovery-checklist.md](references/discovery-checklist.md) for commands and the
complete fact checklist.

## Output Shape

Return:

- repo identity and safe attribution label
- shape inventory with role guesses
- thing/assertion count summary
- recent commit cadence or a fallback cadence signal
- sensitivity classification: `public-safe`, `internal`, `private`, or `unknown`
- read/write expectation: read-only, write-enabled, or unknown
- gaps that block app, ingestion, sharing, or component work
- manifest update path if applicable

## Success Criteria

- All facts come from `wh` reads, user-provided context, or explicit inference.
- The skill makes no WarmHub mutations.
- Downstream stages can decide whether to proceed, ask one missing question, or hand off to design.
- The result includes an attribution URL or states why attribution should be withheld.

## References

- [discovery-checklist.md](references/discovery-checklist.md) — read-only commands, facts to collect,
  and stop conditions.

## Next steps

Now that the repo facts are known, choose the next move:

- **Build a display** — `Use build-warmhub-display with this repo summary.`
- **Plan ingestion** — `Use plan-warmhub-ingestion to connect sources or human collection.`
- **Connect an app** — `Use connect-warmhub-app to wire SDK, auth, and attribution.`

End with:

```text
Next step:
- Recommended: <one next stage or action>
- Alternatives: <short list of valid next stages/actions>
- Manifest updated: <path or not updated>
- Ready for: <stage-name or human decision>
- Blocking questions: <none or concise list>
```
