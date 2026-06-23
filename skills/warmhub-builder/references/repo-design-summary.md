# Repo Design Summary

Use this contract for `repoDesignSummary` in `.warmhub-builder/project-state.json`.

```json
{
  "warmhubRepo": {
    "repo": "org/repo or proposed org/repo",
    "repoState": "new | existing | unknown",
    "attributionUrl": "public attribution URL or blank with reason"
  },
  "repoDesignSummary": {
    "shapeInventory": [
      {
        "name": "ShapeName",
        "kind": "thing | assertion",
        "role": "durable entity | period fact | event fact | source record | QC artifact | config",
        "about": "target shape for assertions, blank for things",
        "servesQuestions": ["question this shape exists to answer"],
        "requiredFields": ["fieldName"],
        "optionalFields": ["fieldName"]
      }
    ],
    "identityModel": "canonical ids, aliases, duplicate handling, and source provenance",
    "assertionModel": [
      {
        "shape": "AssertionShape",
        "fact": "fact being asserted",
        "aboutCardinality": "single | pair | triple | set | list",
        "aboutTarget": "single target shape or collection member roles",
        "fourDirection": {
          "subject": "pass | blocked",
          "object": "pass | blocked | not-applicable",
          "aggregation": "pass | blocked",
          "derivedRollup": "pass | blocked | not-applicable",
          "notes": "graph traversal rationale"
        },
        "provenance": "source identity, actor, or confidence needed",
        "pitfallsChecked": ["cardinality", "identity", "traversability"],
        "deferredContract": "blank or [F] future primitive/arity contract; ingestion owns staged fields and migration trigger"
      }
    ],
    "updateCadence": "latest cadence, backfill boundary, source freshness expectations",
    "writeModel": "ingest-only | human-collection | app-writes | mixed | read-only",
    "qcModel": "checks, Assessment assertions, thresholds, and failure policy",
    "sensitivity": "public-safe | private/internal | unknown"
  }
}
```

Review checklist:

- Thing shapes represent durable identities, not measurements.
- Assertion shapes name the fact being asserted and the target they are about.
- Every assertion shape records `aboutCardinality` and a four-direction result.
- Relationship assertions use Pair, Triple, Set, or List when a single target would hide an endpoint.
- Source records are modeled only when they help idempotency, replay, or provenance.
- Reporting periods are explicit when facts repeat over time.
- Human/mobile collection is captured in `writeModel`, even if the collector is built later.
- If a required primitive cannot be emitted yet, `deferredContract` records the future primitive and
  arity contract. The ingestion plan owns staged fields, accepted pitfall, migration trigger, and
  deterministic re-derivation fields.
- Actual-row inspection and snapshot absence implementation belong in the ingestion plan; this summary
  records only the design pressure they must satisfy.
- Sensitivity controls attribution and sharing guidance for later app stages.
- The design passes the convergence checkpoint: shapes earn questions, traversals work,
  primitives fit, foundations apply, and relevant pitfalls are walked.
