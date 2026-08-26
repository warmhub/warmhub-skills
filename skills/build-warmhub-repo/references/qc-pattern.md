# QC Pattern

Quality checks validate ingested data and produce Assessment assertions about ReportingPeriod things.

## Architecture

QC checks usually:
1. load the `ProgramSummary` for a period
2. load the detail activity assertions for that same period
3. run validation logic
4. produce Assessment add/revise operations
5. commit the assessments back to the repo

## Implementation

```typescript
import type { Operation, WarmHubClient } from '@warmhub/sdk-ts'

interface QcResult {
  checkName: string
  passed: boolean
  confidence: number
  rationale: string
  details?: string
}

async function loadActivities(
  client: WarmHubClient,
  periodWref: string,
): Promise<Array<Record<string, unknown>>> {
  const activities: Array<Record<string, unknown>> = []

  for await (const item of client.thing.queryIter(org, repo, {
    shape: 'MyActivity', kind: 'assertion', limit: 500,
  })) {
    const data = item.data as Record<string, unknown> | undefined
    if (data?.period === periodWref) activities.push(data)
  }

  return activities
}

async function runQcChecks(
  client: WarmHubClient,
  periodLabel: string,
): Promise<{ results: QcResult[]; operations: Operation[] }> {
  const results: QcResult[] = []
  const operations: Operation[] = []
  const periodWref = `ReportingPeriod/${periodLabel}`

  const existingAssessments = new Set<string>()
  let summary: Record<string, unknown> | null = null

  const about = await client.thing.aboutAll(org, repo, periodWref, { max: 10_000 })

  for (const item of about) {
    if (item.shapeName === 'Assessment') {
      existingAssessments.add(`Assessment/${item.name}`)
    }
    if (item.shapeName === 'ProgramSummary') {
      summary = item.data as Record<string, unknown>
    }
  }

  const activities = await loadActivities(client, periodWref)

  // Run totals / range / completeness checks here.
  // Convert each result with toAssessmentOp below.

  return { results, operations }
}
```

## Standard Checks

### Totals Cross-Check

```typescript
const sumAmount = activities.reduce((s, a) => s + (Number(a.amount) || 0), 0)
const summaryAmount = Number(summary?.total_amount) || 0
const diff = Math.abs(sumAmount - summaryAmount)
const tolerance = summaryAmount * 0.01
const passed = diff <= tolerance
```

### Range Validation

```typescript
const hasNegative = activities.some(
  (a) => (Number(a.count) || 0) < 0 || (Number(a.amount) || 0) < 0,
)
const maxShare = Math.max(...activities.map((a) => Number(a.share_pct) || 0))
const passed = !hasNegative && maxShare <= 50
```

### Completeness

```typescript
const expectedCount = Number(summary?.total_entities) || 0
const actualCount = activities.length
const passed = actualCount === expectedCount
```

## Assessment Operations

Use `revise` for existing assessments and `add` for new ones.

```typescript
function toAssessmentOp(
  periodLabel: string,
  result: QcResult,
  existing: boolean,
): Operation {
  return {
    operation: existing ? 'revise' : 'add',
    kind: 'assertion',
    name: `Assessment/${periodLabel}/${result.checkName}`,
    ...(existing ? {} : { about: `ReportingPeriod/${periodLabel}` }),
    data: {
      check_name: result.checkName,
      passed: result.passed,
      confidence: result.confidence,
      rationale: result.rationale,
      details: result.details || '',
    },
  }
}
```

## Partial Data Policy

The current query surfaces are paginated, so QC should normally use the SDK iterator until it is
exhausted.
Only report partial-data uncertainty when you intentionally stop early or impose a tighter local
bound for cost reasons.

If you intentionally use bounded reads, record that explicitly in the assessment rationale instead of
pretending the check was complete.
