# Discovery Checklist

Use this reference when inspecting an existing WarmHub repo. Stay read-only.

## Commands

Always pass `--graph <org/graph>` unless the user has explicitly configured the repo for the current
directory.

```bash
wh prime
wh graph view <org/graph> --json
wh shape list --graph <org/graph> --json
wh thing list --graph <org/graph> --count --json
wh assertion list --graph <org/graph> --count --json
wh thing history --graph <org/graph> --shape <ShapeName> --limit 10 --json
```

For shape-specific inventory:

```bash
wh thing list --graph <org/graph> --shape <ShapeName> --count --json
wh thing query --graph <org/graph> --shape <ShapeName> --count --json
wh assertion list --graph <org/graph> --shape <ShapeName> --count --json
```

If the CLI response includes pagination cursors, follow them when the first page is too small to
support a count or sensitivity claim.

## Facts To Collect

- **Repo identity:** `org/graph`, display name, description, canonical app URL if safe to disclose.
- **Shapes:** names, field summaries, and likely role:
  - durable thing
  - assertion/fact/measurement
  - reporting period
  - QC/assessment
  - config/control
  - unknown
- **Counts:** rough current counts by shape, with any pagination caveat.
- **Cadence:** recent commit timestamps/authors/messages, or fallback timestamps from current data.
- **Read/write expectation:** read-only display data, write-enabled repo, human collection target, or
  unknown.
- **Sensitivity:** public-safe, internal, private, or unknown.
- **Attribution:** canonical URL or a safe label for source attribution.
- **Gaps:** missing shapes, provisional identity rules, unclear write model, unclear QC model, or
  missing access credentials.

## Stop Conditions

Stop discovery and hand off instead when:

- no WarmHub repo exists yet;
- shape design is missing or clearly provisional;
- identity rules are unclear enough that a downstream app would invent slugs or joins;
- source data, ingest cadence, QC, or repo naming is still being designed;
- the user says the repo identity itself may be sensitive and has not approved attribution.

## Manifest Update

When a project-state manifest exists, update only discovery-owned fields:

```json
{
  "warmhubRepo": {
    "repo": "org/graph",
    "repoState": "existing",
    "attributionUrl": "https://app.warmhub.ai/orgs/org/graphs/repo"
  },
  "repoDesignSummary": {
    "shapeInventory": [],
    "updateCadence": "summary",
    "sensitivity": "public|internal|private|unknown"
  }
}
```

Do not overwrite design-owned fields unless discovery proves the prior manifest is stale.
