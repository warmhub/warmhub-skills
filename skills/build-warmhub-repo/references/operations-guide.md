# Operations Guide

Operations transform parsed source data into WarmHub commit operations.

## Operation Types

```typescript
import type { Operation } from '@warmhub/sdk-ts'

const addThing: Operation = {
  operation: 'add',
  name: 'my-lender-slug',
  shapes: ['Lender'],
  data: { lender_name: 'My Lender', state: 'CA', city: 'San Francisco' },
}

const addAssertion: Operation = {
  operation: 'add',
  name: 'my-lender-slug/fy2026-m05',
  shapes: ['LenderActivity'],
  data: { about: 'my-lender-slug', period: 'period/fy2026-m05', num_approvals: 42 },
}

const reviseAssertion: Operation = {
  operation: 'revise',
  name: 'fy2026-m05/totals-crosscheck',
  shapes: ['Assessment'],
  data: { passed: true, confidence: 0.95 },
}
```

For collection-targeted assertions (`about` cardinality of `Arc` / `Bond` / `Set` / `List`), the
`data.about` field accepts a **wref only** — an inline collection object is rejected:

```
Invalid operation ... about accepts a wref. Create the collection as its own named operation, then
point the assertion at it.
```

Emit the relationship as its own named `add` op first, then point the assertion's `data.about` at it.
Arc (directed, `from`/`to`), Bond (symmetric, `ends`), Set and List (`members`) are ordinary Things
under their protected Shapes:

```typescript
const addBond: Operation = {
  operation: 'add',
  name: 'duplicate-ticket-a-ticket-b',
  shapes: ['Bond'],
  data: { ends: ['ticket-a', 'ticket-b'] },
}

const addRelationship: Operation = {
  operation: 'add',
  name: 'duplicate-ticket-a-ticket-b/assertion',
  shapes: ['DuplicateAssertion'],
  data: {
    about: 'duplicate-ticket-a-ticket-b',
    subjectWref: 'ticket-a',
    objectWref: 'ticket-b',
    reason: 'same upstream incident',
  },
}
```

The wref the assertion points at is the `name` of the relationship or collection op, with no Shape
prefix: a Thing's wref is its name. Do **not** hand-invent an opaque or hashed wref that
no op creates; the assertion must reference an op present in the same (or a prior) commit.

Give the collection op a **deterministic, source-derived name** — e.g. derived from its sorted
members plus the relationship kind — so re-runs resolve to the same collection wref. This
keeps the two-op block replay-safe and lets `wh commit submit --skip-existing` no-op the collection
and assertion on re-ingest instead of duplicating them. After committing, verify the readback path
with `wh thing about <endpoint> --resolve-collections`.

## SDK And CLI Verb Map

The SDK and CLI do not always use the same verb names:

| Task | SDK | CLI |
| --- | --- | --- |
| Read one record | `client.thing.get(org, repo, wref)` | `wh thing view <wref> --repo <org>/<repo>` |
| Query current records | `client.thing.head`, `headAll`, `query`, or `queryAll` | `wh thing query --repo <org>/<repo>` |
| Create a shape | `client.shape.create(...)` | `wh shape create ...` |
| Revise a shape | `client.shape.revise(...)` | `wh shape revise ...` |
| Submit operations | `client.commit.apply(org, repo, message, ops, opts)` | `wh commit submit --repo <org>/<repo> --file <file> -m <message>` |

There is no `wh thing get`; use `wh thing view` when translating SDK examples to CLI checks. For
inline commit JSON, `wh commit submit --ops '[...]'` is valid; for an ops file, use `--file`.

## Naming Conventions

Thing names are unique across all Shapes in a repo, so a name that could collide across Shapes
carries its own distinguishing segment. The Shape goes in `shapes`, never in the name.

- things: `<slug>`
- assertions: `<entity-slug>/<period-label>`
- periods: `period/<label>`
- summaries: `summary/<period-label>`
- assessments: `<period-label>/<check-name>`

Use deterministic, source-derived names so retries are safe.

## Slug Generation

```typescript
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function entitySlug(name: string, city: string, state: string): string {
  return [slugify(name), slugify(city), state.toLowerCase()]
    .filter(Boolean)
    .join('-')
}
```

## Commit Strategy

### Start With Semantic Commits

Preferred order:
1. keep one natural business unit per commit, such as one reporting period
2. split by a meaningful domain key when the natural unit is too large
3. use staged or multi-commit workflows only when size, restartability, or backfill behavior makes
   them necessary

For large ingest design, use `wh-commit-design` instead of hard-coding a legacy small-batch limit.

### JSONL Is The Bulk Default

For a bulk import, write deterministic operations to JSONL and let the CLI group them on the
client. Give the logical submission stable identities and make add-only replay explicit:

```bash
wh commit submit --repo <org>/<repo> --file operations.jsonl \
  --stream-id import-2026-05 --submission-id <stable-uuid> --skip-existing \
  -m "Import May 2026"
```

Keep the `submissionId`, `streamId`, each client group/ordinal, its derived `eventRequestId`,
request digest, and returned receipt with the source artifact. `--skip-existing` makes a named
`add` a `noop` on an independently repeated import; it does not replace receipt recovery.

Do not make direct `client.stream.append()` calls the ordinary ingestion baseline. It is an
advanced, caller-orchestrated surface. Use it only when the approved plan needs that control and
can retain the same identity and body for an exact retry.

### Bounded Server Preflight And Recovery

Before a real group, use the server evaluator against that complete bounded group:

```bash
wh commit submit --repo <org>/<repo> --file group.json --dry-run \
  --skip-existing -m "Import May 2026"
```

Or call `client.commit.validate(org, repo, operations, { message, skipExisting: true })`.
Both are snapshot preflights, limited to 10,000 operations and 4 MiB. They validate with server
truth but do not reserve repository state, create a receipt, or authorize the later write; inspect
every operation result and re-handle any real-write failure.

On a timeout, reset, or malformed response after dispatch, the result is ambiguous. Stop later
groups, retain the recorded `eventRequestId`, and recover that exact receipt with
`wh commit receipt <event-request-id>` (or `client.commit.getReceipt`). Retry only the unchanged
group under its original submission identity when receipt recovery returns an opaque not-found.
Never infer success from current graph state, a later conflict/noop, or the stream id.

### Optional Conflict-Isolating Two-Phase Pattern

If durable entity adds often collide with existing data, stage them separately from downstream
assertions.

```typescript
import { isWarmHubError } from '@warmhub/sdk-ts'

async function applyEntityAdds(batch: Operation[]) {
  let pending = [...batch]
  const message = 'add lender entities'

  while (pending.length > 0) {
    try {
      await client.commit.apply(org, repo, message, pending)
      break
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isConflict = isWarmHubError(err) && err.kind === 'CONFLICT'
      const match = msg.match(/Thing "([^"]+)" already exists/)
      if (!isConflict || !match) throw err

      // A same-Shape duplicate's message may still spell the name as
      // `<Shape>/<name>`, so match either spelling.
      const conflicting = match[1]
      pending = pending.filter(
        (op) =>
          op.name !== conflicting &&
          !('shapes' in op && `${op.shapes?.[0]}/${op.name}` === conflicting),
      )
    }
  }
}
```

Critical rule: remove only the conflicting operation, not the whole batch.

If you do not need explicit attribution, omit the `opts` argument. If you do pass
`opts.committer`, it must be the wref of an existing Thing, such as `data-ingest` or
`wh:other-org/other-repo/bot-1`.

```typescript
await client.commit.apply(org, repo, message, pending, { committer: 'data-ingest' })
```

## Dedup And Idempotency

### Page Through Existing Entities

```typescript
import { type WarmHubClient, isWarmHubError } from '@warmhub/sdk-ts'

async function getExistingEntities(client: WarmHubClient): Promise<Set<string>> {
  const slugs = new Set<string>()

  try {
    for await (const item of client.thing.headIter(org, repo, { shape: 'MyEntity', limit: 500 })) {
      slugs.add(item.name)
    }
  } catch (err) {
    if (!isWarmHubError(err) || err.kind !== 'NOT_FOUND') throw err
  }

  return slugs
}
```

For Python, use `repo.things.head_iter(shape="MyEntity")` for a scan, or
`repo.things.head_all(shape="MyEntity", max_items=10_000)` when materializing a bounded result is
appropriate.

### Check Existing Ingest Records

```typescript
async function getExistingIngest(client: WarmHubClient, periodLabel: string) {
  try {
    const thing = await client.thing.get(org, repo, `ingest/${periodLabel}`)
    const data = thing.data as Record<string, unknown> | undefined
    if (data?.file_hash) return { fileHash: String(data.file_hash) }
  } catch (err) {
    if (!isWarmHubError(err) || err.kind !== 'NOT_FOUND') throw err
  }
  return null
}
```

### Hash The Source Artifact

```typescript
async function hashBuffer(buffer: ArrayBuffer): Promise<string> {
  const hash = new Bun.CryptoHasher('sha256')
  hash.update(new Uint8Array(buffer))
  return hash.digest('hex')
}
```

Skip or short-circuit ingestion when the same period already has the same source hash.

`add` is not intrinsically idempotent: a replay with the same deterministic name should detect the
existing thing/assertion and skip, revise, or isolate the conflicting op according to the plan. A replay
with timestamps, random ids, or run-local sequence numbers creates duplicates.

## Toy Slice Gate

Before any ingest larger than roughly 10k operations, run a representative 100-1000 row slice through
the real commit path:

1. Register or update all shapes.
2. Emit source rows that cover optional fields, cross-source joins, null values, and relationship
   assertions.
3. Commit the slice to WarmHub.
4. Verify per-shape counts match the emitted slice.
5. Run `wh repo describe` and inspect shape/field descriptions without project context.
6. Run the load-bearing traversals from the question catalog, including reverse `refs --inbound` for
   typed wref fields and `thing about --resolve-collections` for collection `about` assertions.

Passing local tests but failing this gate means the build is not adoption-ready. Fix the shape,
mapping, or write path before loading volume.

## Large Ingests

When a single semantic unit is large:
- keep the semantic grouping explicit
- persist resumable state
- consider JSONL / streamed ingest paths for bulk operations
- validate on a representative slice before full replay
- design the partition plan with `wh-commit-design`

Avoid copying old "200 ops per commit" guidance from the Convex era. The returned backend supports
larger workflows; the right limit is driven by semantic clarity, restartability, and observed run
behavior.
