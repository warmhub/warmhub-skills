# Naming: The Load-Bearing UX of the Graph

Names are not labels you attach to things after the fact. In a WarmHub graph the
name **is** the identity, and the shape of the name is the primary interface two
audiences use to navigate the graph at all:

- **Humans visually navigate by name.** A reader scanning query output, a tree of
  wrefs, or `describeRepo` reconstructs the structure of the graph from the names
  alone. Hierarchical, scoped names read like a filesystem; flat opaque names read
  like a hash dump. The difference is whether a person can find their way without
  a side lookup.
- **Humans and agents query by name prefix.** A coherent `/`-delimited hierarchy
  turns the name space into a queryable index. `QualityFinding/<org>/<repo>/pull/142/*`
  returns every finding on one PR with a glob, no field scan. The hierarchy you
  design *is* the query surface you (and every future agent) get for free.

Getting this right is cheap at design time and expensive to retrofit — `about` is
immutable, and a thing's name is its identity, so a rename is a retract-and-replay
migration (see [migrations.md](../../build-warmhub-repo/references/migrations.md)), not an edit. Treat naming as a
first-class design activity, not a formatting pass.

The principles below are distilled from production WarmHub naming schemes. The
running example is a **code-review quality graph**: two producers — a PR-review lane
and a repo-wide scan lane — both write findings about the same codebase, and rigorous
naming is what keeps them referencing one identity instead of forking it.

---

## Principle 1 — The name is identity; metadata lives in assertion data

A name encodes *what the thing is*, never *where it came from* or *what state it is
in*. Provenance (source, loader, harness), certainty, status, queue rank, and any
other mutable or contextual fact belong in assertion data, not in the name.

- **Good.** `QualityFinding/<org>/<repo>/pull/142/c-9a1208` — repo, scope, PR, stable
  comment id. Two different harnesses that observe the same finding name the *same*
  node; the harness is recorded as a field on the observation assertion.
- **Avoid.** `QualityFinding/nightly-import-142-…`, `Claim/needs-support`,
  `ReviewTarget/rank-1`. The loader tag, the review status, and the queue rank are
  all data — baking them into the name forks identity and rots the moment state
  changes.

The test: if two producers, or the same producer at two different times, would
legitimately describe the same real-world entity, they must compute the **same
name**. Anything that varies between them is metadata, not identity.

## Principle 2 — `/` is the structural delimiter; segments are a stable hierarchy

`/` separates hierarchy levels and is preserved by id-sanitization; everything else
collapses to a safe character. Design the segment order from most-stable/broadest to
most-specific so that every prefix is a meaningful set:

```
QualityFinding / <org>/<repo> / pull/<n> / <commentId>
   shape           scope          sub-scope   leaf identity
```

- Org and repo are **separate segments**, not a fused string — so you can glob one
  org across repos, or one repo across PRs.
- Scope segments are drawn from a small fixed vocabulary that reflects the real
  partition of the domain: PR-scoped work uses `pull/<n>/`; repo-wide scans use
  `scan/<kind>/`. A reader learns the vocabulary once and predicts every name.
- The leaf segment is the narrowest stable identity (a comment id, a content hash,
  a canonical path).

Every level you add should be a level someone will want to glob on. If no query
will ever filter at a segment boundary, that boundary is noise.

## Principle 3 — One naming authority

Build names in exactly one place that every producer calls. When each lane invents
its own string-formatting for the "same" thing, identity silently forks: the review
lane writes a file path one way (`web/src/cart.ts`), a scanner writes it another
(`src/cart.ts`), and the graph now has two `SourceModule` nodes for one file. The
four-direction test passes on each in isolation; the graph is still broken.

A shared naming function — one callable like `findingName(repo, pr, commentId)` that
every producer imports — is the chokepoint that makes convergence structural rather
than aspirational. In a repo without a code producer, the equivalent is a written
naming contract in the modeling guide that every importer follows verbatim.

## Principle 4 — Names converge: one real entity, one node

Inputs to the naming function are often *not* already canonical — package-relative
paths, aliases, legacy id formats. Normalize them **inside** the naming authority so
that all spellings of one entity land on one node:

- Normalize variant paths onto a single repo-root form before they enter the name
  (so `cart.ts`, `src/cart.ts`, and `web/src/cart.ts` all converge to one
  `SourceModule`).
- Provide explicit recovery for legacy id formats so a migration maps old names onto
  the new scheme deterministically (e.g. recovering a `commentId` from a legacy fused
  `org-repo-pr-comment` finding id).

Identity is the name; any content hash the shape also stores should be derived from
the **same canonical inputs**, so the data field can't disagree with the name.

## Principle 5 — Deterministic over opaque; pick the leaf by semantics

Names should be reconstructable from stable seeds wherever possible. This is what
makes the sample-first analytical workflow cheap: build a list of seeds → construct
the deterministic wrefs → batch-fetch in two calls instead of a multi-hour full scan.

Choose the leaf segment by the entity's identity semantics:

- **1:1-unique source id** → use it directly. Review findings key on a comment id
  (one comment, one finding, forever). The crosswalk to other systems stays
  *deterministic*.
- **Content-recurring entity** → use a content hash of the defining fields. Scan
  findings key on a hash over (rule, location, message) so the *same* defect
  re-observed across runs collapses to one node. **Recurrence is then derived from
  the name, not stored as state** — you never need a `seen-again` flag.

Use opaque names (UUIDs, sequence numbers) only when no stable seed exists and the
instance count stays small. When in doubt about future analytical access, prefer
deterministic.

## Principle 6 — Content-addressed boundaries are name segments, not version pins

When a thing has a versioned-by-content identity (a policy, an eval spec), append the
content hash as a **`/` name segment** — not with `@`, which is reserved for wref
version pins and is rejected inside a thing-name segment:

```
QualityPolicy/standard-gate/sha256-old
QualityPolicy/standard-gate/sha256-new
```

Old assertions made under `sha256-old` remain valid history, and a reader can tell at
a glance which verdicts were issued under a now-stale policy — the staleness is
visible in the name. This is the naming half of **Stale-Verdict Retraction
Discipline** ([design-rules.md](../../modeling-foundations/references/design-rules.md)): the hash segment is the boundary a
policy change retracts against.

---

## Worked example — a multi-producer code-review quality graph

One naming authority, two lanes, one identity per entity. Note how scope vocabulary
(`pull/` vs `scan/`) partitions the space and how the leaf differs by semantics
(unique comment id for review, content hash for scans). `<org>/<repo>` is a
placeholder — substitute your own:

```
# shared identity (lane-independent)
Repository/github/<org>/<repo>
SourceModule/<org>/<repo>/web/src/cart.ts          ← canonical, one node
TestCase/<org>/<repo>/web/src/cart.test.ts/handles-empty-cart

# review lane — PR-scoped, leaf = unique comment id
AgentRun/<org>/<repo>/pull/142/review/<run>
QualityFinding/<org>/<repo>/pull/142/c-9a1208
QualityFindingObservation/<org>/<repo>/pull/142/c-9a1208/<run>
FindingDisposition/<org>/<repo>/pull/142/c-9a1208/<run>/accepted

# scan lane — repo-scoped, leaf = content hash (recurrence derived)
AgentRun/<org>/<repo>/scan/lint/<run>
QualityFinding/<org>/<repo>/scan/<contentHash>
QualityFindingObservation/<org>/<repo>/scan/<contentHash>/<run>

# content-addressed boundary — hash as a /-segment, not @
QualityPolicy/standard-gate/sha256-…
```

What this buys, concretely:

| Query intent | Glob / traversal it unlocks |
|---|---|
| All findings on PR 142 | `QualityFinding/<org>/<repo>/pull/142/*` |
| Every observation of one finding across runs | `…/pull/142/c-9a1208/*` |
| All scan findings in a repo | `QualityFinding/<org>/<repo>/scan/*` |
| Verdicts issued under a stale policy | filter names ending `/sha256-old` |
| Did this scan defect recur? | same `<contentHash>` ⇒ same node; no stored flag |

---

## Naming checklist

Run this before adoption (it overlaps Gate 4 in [checkpoint.md](checkpoint.md)):

- [ ] **Identity, not metadata.** No name contains a loader tag, source, harness,
      certainty, status, or queue rank. Two producers describing the same entity
      compute the same name.
- [ ] **Hierarchical and prefix-meaningful.** `/`-delimited; org and repo are
      separate segments; every segment boundary is one a query would filter on.
- [ ] **Stable scope vocabulary.** Scope segments (`pull/`, `scan/`, source-kind)
      come from a small fixed set a reader can learn once and predict.
- [ ] **One authority.** Names are built in one place (a shared naming function or a
      written contract every importer follows), with canonicalization inside it so
      variant inputs converge to one node.
- [ ] **Leaf chosen by semantics.** Unique entities use their unique id; recurring
      entities use a content hash so recurrence is derived, not stored.
- [ ] **Deterministic from seeds** wherever an analytical consumer will want
      stratified batch-fetch. Opaque ids only when no stable seed exists.
- [ ] **Content-addressed boundaries** appended as `/`-segments (never `@`).
- [ ] **Reads without a lookup.** Hand a colleague a single wref from the graph.
      If they can't say what it is and where it sits, the name is underspecified.
