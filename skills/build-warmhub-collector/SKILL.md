---
name: build-warmhub-collector
description: >
  Build a mobile-first WarmHub data collection app that submits end-user observations as WarmHub
  things and assertions. Use when a project manifest, RepoDesignSummary, ingestion plan, or existing
  WarmHub repo needs an ingress/write surface with forms, media, geolocation, barcode or scan input,
  offline queueing, collector identity, provenance, QC-at-ingress, and a safe write path. Trigger
  phrases: "build warmhub collector", "mobile data collection", "submit data to WarmHub",
  "offline collection app", "field collection PWA", "human collection as ingestion".
---

# Build WarmHub Collector

## Objective

Choose and scaffold the smallest useful mobile-first write surface for WarmHub. This stage owns
collector concerns only: capture mode, identity mode, field mapping, offline behavior, anti-abuse,
QC-at-ingress, write-path handoff, starter files, validation, and manifest updates.

Do not redesign shapes, build display surfaces, install components, or duplicate shared repo
discovery, SDK, auth, token-safety, or attribution guidance.

## Inputs

Accept any combination of:

- project-state manifest with `warmhubRepo`, `repoDesignSummary`, `ingestion`, and `collector`
- repo fact summary from `discover-warmhub-repo`
- app connection summary from `connect-warmhub-app`
- ingestion plan that lists human/mobile collection as a source
- target WarmHub `org/repo` plus collection intent
- user constraints: capture modes, audience, sensitivity, contributor trust, offline needs, and QC

If repo facts are missing, compose `discover-warmhub-repo` first. If token boundary, one-fact probe,
sharing mode, or write authorization is not settled, compose `connect-warmhub-app`. If human/mobile
collection is not represented in `ingestion.sources`, hand findings back to `plan-warmhub-ingestion`.

## Workflow

1. Read the manifest, repo summary, and ingestion plan. Do not invent shape or assertion targets.
2. Use [references/capture-rubric.md](references/capture-rubric.md) to choose capture modes,
   identity mode, offline mode, public/invite posture, anti-abuse, and QC-at-ingress.
3. Use [references/identity-and-provenance.md](references/identity-and-provenance.md) to implement:
   - anonymous device/app-instance identity as a first-class collector identity;
   - WarmHub-account-attributed identity when per-user provenance is required;
   - optional hybrid claim/upgrade behavior.
4. Use [references/write-path.md](references/write-path.md) to choose direct SDK writes only when
   safe; otherwise route submissions through a deployed handler that owns WarmHub credentials,
   validation, commits, and QC.
5. Copy or adapt [templates/collect-pwa](templates/collect-pwa) for the first public starter unless
   the user already has an app surface.
6. Map each form/media/GPS/scan field to approved things and assertions, including provenance keyed
   by the chosen identity mode.
7. Prove one queued submission can flush through the chosen write path, or return the exact blocker.
8. Update manifest `collector` and `ingestion` fields with identity mode, capture modes, offline
   mode, write path, validation status, and remaining blockers.
9. End with the standard next-step block.

Use the runtime's user-input tool for path-changing collector decisions. Put the recommended choice
first, offer 2-4 concrete choices with tradeoffs, and ask one question at a time. If no tool is
available, ask the same question in numbered prose.

## Output Shape

Return:

- selected capture modes, identity mode, offline mode, and public/invite posture
- field-to-shape/assertion mapping and provenance model
- files scaffolded or exact implementation plan
- write path: direct SDK, handler, or blocked with reason
- QC-at-ingress and anti-abuse checks
- submission test result or exact blocker
- manifest fields updated, or exact JSON patch the user should apply
- remaining app, deployment, credential, or ingestion-plan work

## Success Criteria

- The collector composes `discover-warmhub-repo` and `connect-warmhub-app`, or records a minimal
  fallback with facts gathered.
- Human/mobile collection is modeled as an ingestion source, not local app-only state.
- Anonymous collector-instance and WarmHub-account-attributed identity modes are both supported.
- Submitted assertions include provenance keyed to the selected identity mode.
- WarmHub service credentials stay server-side; browser code never contains PATs or broad write
  tokens.
- Offline queueing, retry behavior, and QC-at-ingress are explicit.
- The answer ends with a next-step block.

## References

- [capture-rubric.md](references/capture-rubric.md) — capture, offline, identity, trust, and QC choices.
- [identity-and-provenance.md](references/identity-and-provenance.md) — collector identity modes and provenance fields.
- [write-path.md](references/write-path.md) — direct-vs-handler write path and validation.
- [templates/collect-pwa](templates/collect-pwa) — mobile-first offline-capable PWA starter.

## Next steps

After the collector is scaffolded and a submission path is tested, choose the next move:

- **Test submission E2E** — run one real queued submission through the handler and WarmHub commit.
- **Revise ingestion** — `Use plan-warmhub-ingestion if collector fields change source mapping.`
- **Add automation** — `Use add-warmhub-component if the collector needs self-healing sync or QC.`
- **Build display** — `Use build-warmhub-display to show collected submissions.`
- **Share demo** — provide submission test receipts, caveats, and reproduce notes to reviewers.

End with:

```text
Next step:
- Recommended: <one next stage or action>
- Alternatives: <short list of valid next stages/actions>
- Manifest updated: <path or not updated>
- Ready for: <stage-name or human decision>
- Blocking questions: <none or concise list>
```
