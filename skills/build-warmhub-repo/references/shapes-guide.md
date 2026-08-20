# Shapes Guide

Shapes define the schema for things and assertions in WarmHub.

## Field Types

Supported scalar types: `string`, `number`, `boolean`, `wref`.

Optional fields use `?` suffix on the key:
```typescript
{ "institution?": "string" }  // optional
{ "institution": "string" }   // required
```

Array fields use an array declaration instead of JSON-stringifying list values:

```typescript
{ "evidence": { "type": "array", "items": "wref" } }
{ "tags?": { "type": "array", "items": "string" } }
```

Use `wref` for fields that should participate in ref traversal. Multi-valued refs should use native
`wref` arrays, not stringified JSON blobs.

Field syntax must be proven on the target WarmHub backend before adoption. A local TypeScript object
or ops fixture is not enough: create or update the shape, write one bounded instance, and read it back
with the same CLI/API path downstream agents will use.

## Standard Shape Set

Every ingestion repo should define these shapes:

### Domain Entity (Thing)
The primary entity being tracked. Name it after the domain concept.

```typescript
Lender: {
  lender_name: 'string',
  state: 'string',
  city: 'string',
  'institution?': 'string',
}
```

### ReportingPeriod (Thing)
Represents a time period for which data is reported.

```typescript
ReportingPeriod: {
  fiscal_year: 'number',
  month: 'number',
  period_label: 'string',
  report_date: 'string',
  source_url: 'string',
}
```

### Activity/Measurement (Assertion about the entity)
The per-period measurement for each entity. This is an assertion `about` the entity thing.

```typescript
LenderActivity: {
  period: 'wref',            // wref to ReportingPeriod
  num_approvals: 'number',
  approval_amount: 'number',
  rank: 'number',
  share_pct: 'number',
  avg_loan_size: 'number',
}
```

### ProgramSummary (Assertion about ReportingPeriod)
Aggregate totals for a period. Assertion `about` the ReportingPeriod.

```typescript
ProgramSummary: {
  total_approvals: 'number',
  total_amount: 'number',
  total_entities: 'number',
  avg_size: 'number',
}
```

### IngestRecord (Thing)
Provenance tracking for idempotency. Name: `IngestRecord/<period-label>`.

```typescript
IngestRecord: {
  period: 'string',
  source_url: 'string',
  file_hash: 'string',
  entities_added: 'number',
  entities_revised: 'number',
  ingested_at: 'string',
}
```

### Assessment (Assertion about ReportingPeriod)
QC check results. Name: `Assessment/<period>/<check-name>`.

```typescript
Assessment: {
  check_name: 'string',
  passed: 'boolean',
  confidence: 'number',
  rationale: 'string',
  details: 'string',
}
```

## Creating Shapes via CLI

```bash
wh shape create <ShapeName> --repo <org>/<repo> \
  --fields '{"field1":"string","field2":"number","optional_field?":"string"}'
```

## Creating Shapes Programmatically

```typescript
const SHAPES = { /* as above */ }

for (const [name, fields] of Object.entries(SHAPES)) {
  try {
    await client.shape.create(org, repo, name, fields)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('ALREADY_EXISTS') || msg.includes('CONFLICT')) {
      console.log('%s already exists, skipping', name)
    } else {
      throw err
    }
  }
}
```

## Updating Shapes

To add or change fields, use `wh shape revise` with the FULL field set:

```bash
wh shape revise Lender --repo <org>/<repo> \
  --fields '{"lender_name":"string","state":"string","city":"string","institution?":"string"}'
```

The SDK equivalent is `client.shape.revise(org, repo, shapeName, fields)`. Both the CLI and SDK use
`revise` and require the complete field definition. You cannot add a single field incrementally.
