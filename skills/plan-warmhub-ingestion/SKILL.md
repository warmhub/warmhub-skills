---
name: plan-warmhub-ingestion
description: >
  Plan WarmHub ingestion before repo build or component packaging. Use when turning a
  RepoDesignSummary, source description, existing repo facts, or human collection path into an
  ingestion plan covering source access, transforms, idempotency, backfill, automation, QC, write
  boundaries, and manifest updates. Trigger phrases: "plan warmhub ingestion", "ingestion plan",
  "connect this data source", "plan backfill", "human collection as source".
---

# Plan WarmHub Ingestion

## Objective

Turn an approved repo design and data sources into an ingestion plan that `build-warmhub-repo`,
`add-warmhub-component`, and collector/display stages can rely on.

Do not scaffold repos, write production ingestion code, install components, or build apps.

## Inputs

Prefer a project-state manifest with `repoDesignSummary`. Also accept:

- source descriptions, sample files, API docs, webhook specs, collection forms, or sensor feeds
- existing WarmHub repo identity and repo fact summary
- collector output or intended `build-warmhub-collector` fields
- deployment, cadence, compliance, or availability constraints

When the source is an existing WarmHub repo and facts are stale or missing, compose
`discover-warmhub-repo`; if unavailable, run a minimal read-only inventory before planning.

## Workflow

1. Read `repoDesignSummary`; stop and hand off to `design-warmhub-repo` if shape boundaries,
   identity, assertion targets, about-cardinality, four-direction results, or write model are
   missing.
2. Classify each source: API, file, webhook, externally scheduled pull, human/mobile collection, existing WarmHub
   repo, or mixed.
3. For each source, plan access, parsing, normalization, provenance, retry behavior, and failure
   surfaces.
4. Inspect real source rows before trusting the design contract: `head -2` for files, one representative
   API payload, webhook fixture, or collector envelope. If the real source grain or columns differ from
   the design, return to `design-warmhub-repo` before planning volume ingest.
5. Map source fields to things and assertions. Preserve the approved assertion `aboutCardinality`;
   do not turn endpoints into flat strings for source convenience. If the current write path cannot
   emit the approved primitive yet, stage only inert raw keys/id hints and record the accepted pitfall,
   migration trigger, and re-derivable fields. Keep collection-app submissions as first-class source
   records with provenance, validation, and moderation or QC gates.
6. Define idempotency: source artifact hash, upstream revision id, event id, reporting-period key, or
   composite key. For bulk adds, specify client-grouped JSONL, deterministic names, a recorded
   submission identity, `--skip-existing`, exact receipts, and stop-on-ambiguous-transport recovery.
   Do not generate checkpoints for ordinary ingest or retry. For an explicit reconciliation, reseed,
   export, or outcome-unknown recovery-evidence branch, use
   [repository-checkpoints.md](../wh-commit-design/references/repository-checkpoints.md): retain
   receipts first, then generate, poll, download, and verify a later archive only when needed.
7. Define backfill and steady-state cadence, including external scheduling or a webhook subscription,
   and the snapshot absence policy: full-snapshot deactivate/status, active-only review, later-full field-flip,
   or immutable event-stream ignore.
8. Define provenance and QC assertions, including raw source values, derived semantic values,
   mapping policy/version when mappings can drift, and when the pipeline fails closed, warns, or
   skips. Name one bounded server preflight (`wh commit submit --dry-run` or `client.commit.validate`)
   before a real group; it validates a snapshot and reserves neither state nor a receipt.
9. For every cross-source or cross-repo join, prove a license-clean crosswalk/resolver exists and that
   the join key is time-durable for historical rows. If not, mark the relevant query `[M]` blocked on
   missing data rather than promising an edge.
10. Identify required WarmHub components/runtimes named by the user or design, such as Veritas. Record
   what facts the ingestion repo must write for the component, what shapes the component owns, and
   what downstream stages must wait to read from component outputs.
11. Use the runtime's user-input tool for path-changing decisions. Put the recommended choice first,
   offer 2-4 concrete choices with tradeoffs, and ask one question at a time. If no tool is
   available, ask in numbered prose.
12. Write or return the ingestion plan and append a handoff entry to the manifest when possible.

Read [references/ingestion-plan.md](references/ingestion-plan.md) before finalizing the plan.

## Output Shape

Return:

- `ingestion.sources`
- source-to-shape mapping
- transform and normalization notes
- cardinality-preserving assertion writes
- deferred primitive/id-hint retreats and migration triggers, or `none`
- idempotency key and dedup strategy
- grouped-write, preflight, receipt, and ambiguous-transport recovery policy
- backfill boundary and steady-state cadence
- snapshot absence policy
- cross-source join feasibility result
- automation plan: external scheduler (including cron), webhook, manual, or collector-driven
- component dependencies and write/read boundaries, or `none`
- QC assertions and failure policy
- credential and deployment needs
- manifest path updated, or exact JSON patch the user should apply

## Success Criteria

- Every planned source maps to approved things and assertions.
- Real source rows or payloads were inspected before volume ingest is planned.
- Source mappings preserve the approved `aboutCardinality` and do not hide relationship endpoints in
  string fields.
- Any id-hint-now/typed-edge-later retreat is explicit, inert, re-derivable, and marked alpha until
  live relationship verification passes.
- Human/mobile collection is treated as production ingestion, not app-only state.
- Idempotency, provenance, backfill, and QC are explicit.
- Bulk plans use client-grouped JSONL with stable identity and `--skip-existing`. Preflight is
  bounded and non-reserving, and recovery names the exact receipt lookup plus the stop condition for
  ambiguous transport.
- Checkpoints are absent from ordinary ingest and retry paths. Any explicit reconciliation/reseed/
  export or recovery-evidence branch records checkpoint-specific authority, lifecycle, downloaded
  artifact integrity, and the fact that the archive cannot establish a write offset.
- Field forms new to the project are named for build-stage live verification before adoption;
  local-green is not live-green.
- Existing repo plans use `discover-warmhub-repo` facts or state the fallback facts gathered.
- The answer ends with a next-step block.

## References

- [references/ingestion-plan.md](references/ingestion-plan.md) — required plan fields and source
  classification checklist.
- [repository-checkpoints.md](../wh-commit-design/references/repository-checkpoints.md) — optional
  portable archive, access, verification, and recovery-evidence branch.

## Next steps

After the ingestion plan is approved, choose the next move:

- **Build the repo** — `Use build-warmhub-repo with this ingestion plan.`
- **Add a component** — `Use add-warmhub-component if the repo already exists.`
- **Build a collector** — `Use build-warmhub-collector if human/mobile collection fields must be implemented.`
- **Revise design** — `Use design-warmhub-repo if the plan exposes missing shape or identity decisions.`

End with:

```text
Next step:
- Recommended: <one next stage or action>
- Alternatives: <short list of valid next stages/actions>
- Manifest updated: <path or not updated>
- Ready for: <stage-name or human decision>
- Blocking questions: <none or concise list>
```
