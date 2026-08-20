# Ingestion Plan

Use this contract for `ingestion` in `.warmhub-builder/project-state.json`.

```json
{
  "ingestion": {
    "sources": [
      {
        "name": "source name",
        "kind": "api | file | webhook | cron-pull (external scheduler you run) | human-collection | warmhub-repo | mixed",
        "access": "auth, URL, upload, subscription, or manual source description",
        "sourceSample": "header/payload inspected and where it was recorded",
        "mapsTo": ["ShapeName"],
        "provenance": "source URL, form id, device id, upstream revision, or collector submission id",
        "mappingPolicy": "raw source fields, canonical semantic fields, mapping version, and parser policy",
        "joinFeasibility": "license-clean crosswalk/resolver, time-durable key, or [M] missing-data blocker",
        "cadence": "manual | scheduled | event-driven | collector-driven",
        "failurePolicy": "fail-closed | warn | skip-and-record"
      }
    ],
    "idempotency": "artifact hash, event id, upstream revision, reporting period, or composite key",
    "backfill": "none | bounded range | full history with checkpointing",
    "snapshotAbsencePolicy": "full-snapshot deactivate | active-only review | later-full field-flip | event-stream ignore",
    "deferredPrimitives": [
      {
        "relationship": "query/shape that needs the future primitive",
        "approvedPrimitive": "arc | bond | set | list | typed-wref | wref-array",
        "stagedFields": ["plain string raw keys or id hints"],
        "acceptedPitfall": "write path cannot emit the primitive yet",
        "migrationTrigger": "capability or connector change that unlocks the real edge",
        "reDerivableFrom": ["source fields needed to backfill deterministically"]
      }
    ],
    "automation": [
      {
        "kind": "cron (external scheduler you run) | webhook | manual | collector",
        "purpose": "ingest | qc | maintenance",
        "credentials": "required credential set or none"
      }
    ],
    "qc": ["check name and Assessment assertion target"],
    "status": "planned | blocked"
  }
}
```

Planning checklist:

- Source access is realistic for local verification and deployed automation.
- Real source rows or payloads have been inspected; docs-only schemas are not enough.
- Every transform has a target thing or assertion from the RepoDesignSummary.
- Every assertion write preserves the approved `aboutCardinality` and collection target from
  `RepoDesignSummary.assertionModel`.
- If a primitive is deferred, staged id hints are plain inert payload fields, not fake traversable
  edges; the approved future primitive and migration trigger are recorded.
- Cross-source joins have a license-clean resolver/crosswalk and a durable historical key, or the
  dependent query is marked `[M]` blocked on missing data.
- Absence from a snapshot is interpreted according to the source's snapshot character, not as deletion
  by default.
- Source parsing and normalization are explicit: keep source-verbatim fields where audit matters,
  write canonical semantic fields for matching/grouping, and record the mapping policy or version
  that produced each derived value.
- Human collection has validation, provenance, moderation or QC, and retry behavior.
- Webhook subscriptions and external schedulers state the handler authentication they need.
- Backfill is bounded unless there is a resumable checkpoint plan.
- QC covers completeness, ranges, totals, source freshness, and provenance where relevant.
- Provenance captures source identity, actor or collector identity, raw/derived mapping policy, and
  validation receipt where applicable.
