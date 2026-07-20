# Primitives: Things, Assertions, Collections, and the Traversability Contract

This file is foundational. Every entry path in this skill assumes you understand the four primitives and the traversability contract. If you do, skim. If you don't, read end-to-end before picking an entry.

The canonical reference is [docs.warmhub.ai data-modeling](https://docs.warmhub.ai/data-modeling/overview/). This file lifts the rules that designers most often need at design time, plus the *judgment layer* the docs don't fully cover (when single vs Arc/Bond/Set; when assertions vs things; what to do when bidirectional traversability seems to require both endpoints to be queryable).

---

## The Traversability Contract

A WarmHub graph earns its complexity over text search by enabling cheap multi-hop traversal in *both directions* on every load-bearing relationship. Every shape design either delivers that or breaks it — and breakage is permanent because `about` is immutable.

Before defining any assertion shape, write down every question the graph must be able to answer about it. The `about` target — single thing, Arc, Bond, Set, or List — is whichever one makes those questions resolvable as **graph traversals**, not as field-string filters.

### The four-direction test

For each assertion shape that represents a relationship between two or more things, every load-bearing question must resolve in one of these four directions:

1. **Subject side.** `wh thing about <subject>` returns this assertion.
2. **Object side.** From the other endpoint, the assertion is reachable — *within a repo* via `wh thing about <other-endpoint>` (with `--resolve-collections` if the about target is a collection); *across a repo boundary* via a typed wref **field** traversed with `wh thing refs --inbound <other-endpoint>`. These are not interchangeable — see [§ The four-direction test across a repo boundary](#the-four-direction-test-across-a-repo-boundary) below before applying this step to a cross-repo relationship.
3. **Aggregation.** `wh assertion list --shape <Foo>` finds all assertions of this type.
4. **Derived rollups.** Multi-hop combinations (e.g., "vents addressed by any workaround") fall out as graph walks, not as post-hoc set logic on flat fields.

If any of these requires field-string-match on a wref-shaped string, you've put a wref where it doesn't participate in graph traversal. **The design has lost traversability**, and `about`-immutability means it's permanent.

### The four-direction test across a repo boundary

The reverse direction is served by **two different indexes with different scopes**, and conflating them is the most common way the object-side step yields a wrong answer at a repo boundary:

- **The about-index** (backing `wh thing about` / `query --about`) is **repo-local.** A reverse `about` query run from the target's repo **silently returns `0`** for assertions written in *other* repos — even though the cross-repo write succeeded and the target's existence was validated across repos at write time.
- **The wref-field index** (backing `wh thing refs --inbound`) **fans out across repos.** One call returns inbound references from every repo, consumer repos included.

Forward resolution is *not* the problem: an `about` target (or a wref field) may point at a thing in another repo, the write pipeline validates it across repos, and reading the assertion's own forward reference is a local read. Only the **reverse** direction is scope-split.

The design consequence:

- **Same-repo relationship** → reverse via `wh thing about <endpoint> --resolve-collections` is fine; an `about`-Arc or `about`-Bond gives you both directions for free.
- **Cross-repo relationship** → do **not** rely on reverse `about`. You will see it return `0`, and the four-direction test as a naive checklist will tell you the relationship "isn't traversable" — a false negative that pushes designers to contort the schema (downgrading an `Arc` to single-`about` plus a denormalized string, or simulating the link with an extra assertion + a reactor). The correct construction is a **typed wref field** on the consumer-side thing/assertion, with the object side verified by `wh thing refs --inbound <target>`. This is exactly [`pattern-catalog.md` § 12 — Cross-Repo Substrate-Split](../../design-warmhub-repo/references/pattern-catalog.md); the full design checklist and the lifecycle/orphan prompts a cross-repo link must answer are in [`cross-repo-linkage.md`](cross-repo-linkage.md). (Caveat: `wh thing graph` does not currently walk inbound wref-edges, so don't use `graph` for reverse cross-repo discovery — use `refs --inbound`.)

This scope-split is *current platform behavior*, not a permanent law — which is exactly why it must be **verified, not assumed**. If your platform version might differ, run the 60-second two-repo probe in [`design-rules.md` § Verify Platform Mechanisms Before Encoding](design-rules.md) and let the observed result, not a remembered constraint, drive the `about`-Arc/Bond-vs-typed-wref-field choice.

### Worked example: a vent-resolution graph's Resolution shape (passes)

```
Resolution  ──about──▶  Arc[Vent, ResolutionTarget]
                          │           │
                      (the vent)   (Workaround | Ticket | PullRequest | Wontfix |
                                    Explanation | cross-repo Lesson)
```

| Question | Traversal | Answers as graph operation |
|---|---|---|
| What resolved this vent? | `wh thing about Vent/X --resolve-collections` | ✓ |
| Which vents does this workaround resolve? | `wh thing about Workaround/Y --resolve-collections` | ✓ |
| All unresolved vents about a FrictionTarget | `thing about FrictionTarget/Z --shape Vent` ⊖ vents in any Resolution Arc | ✓ derived |
| All vents addressed by any fix on FrictionTarget Z | walk Z → Vent → Resolution → ResolutionTarget | ✓ 3-hop traversal |

A single design choice — a named Arc collection created by a prior op, then `about: "Arc/<name>"` — yields all four queries for free.

### Worked example: a duplicate-ticket graph's DuplicateAssertion (fails)

```ts
{
  kind: "assertion",
  name: "DuplicateAssertion/dup-X",
  about: subjectWref,           // ← about ONE ticket
  data: {
    originalWref: originalWref, // ← the OTHER ticket is a flat field
    reason: reason,
  },
}
```

| Question | What happens |
|---|---|
| Which canonical ticket does this duplicate point to? | works (via the `originalWref` field) |
| What tickets are duplicates of this canonical? | **doesn't traverse** — `originalWref` is a string, not a wref edge; not visible to `thing refs` |
| Show me all duplicate clusters | requires manual ingestion of all DuplicateAssertions and string-grouping by `originalWref` |
| Get me everything about this ticket (including being-marked-duplicate-of) | one-sided — only the `about` side returns it |

Same problem class as the vent-resolution example. Different design choice. Completely different answer surface. **And this choice can't be fixed in place** because `about` is immutable — those existing assertions have to be retracted and re-asserted.

### The recovery path when traversability is broken

`about` is immutable. If you assert against the wrong target:

1. Retract the bad assertion(s).
2. Re-assert with the correct target (Arc / Bond / Set / List as appropriate).

The retracted assertions remain in version history but are hidden from default queries. This is workable when caught early; expensive when discovered after large data load.

**The lesson:** apply the four-direction test *before* defining the shape, not after data is loaded.

---

## Things vs Assertions — the canonical question

From [docs.warmhub.ai](https://docs.warmhub.ai/data-modeling/things/):

> **Use things when you're modeling entities with a single canonical state — the objects your system reasons about. A company, a sensor, a document. If there's one truth about this entity, it's a thing.**
>
> **Use assertions when attribution, confidence, or multiple perspectives matter — when you need to know who said something about an entity, not just the current state.**

In practice:

| Use a thing for | Use an assertion for |
|---|---|
| External-source proxies (papers, commits, services, tickets) | Claims, hypotheses, classifications, evaluations |
| Entities with one canonical truth | Multi-author observations about entities |
| Lookup tables (country codes, status enums) | Belief-with-confidence about entities |
| Internal artifacts the graph generates | Provenance / basis edges between things |
| Configuration objects | Decision events with rationale |
| Identity proxies | Continuous-evidence signals after adoption |

> **Things vs assertions tip (from docs):** "Not everything needs to be a belief. A lookup table of country codes is fine as plain things. An agent's assessment of whether a competitor is a threat — that's an assertion."

### Things are versioned too

Don't reach for assertions just to track change over time. Things are versioned natively; `revise` gives you full history on a thing without an assertion ceremony. Reach for assertions when *who said it* or *how confident were they* matters, not when *what changed* matters.

### Decision flowchart

If you're hovering between thing and assertion for some object:

1. Will anyone ever ask **"who said this?"** about it? → assertion.
2. Will multiple actors / sources / perspectives have **different views** on the same fact? → assertion.
3. Does it carry **uncertainty, evidence, or confidence** that evolves over time? → assertion.
4. Otherwise → thing. The single-canonical-state test ("is there one truth about this?") suffices.

---

## The `about` field is immutable

From the docs:

> **The `about` reference is set at creation and cannot be changed.** On revise, you can update the assertion's data, but never its about reference. If you assert about the wrong target by mistake, the recovery path is: retract the mis-targeted assertion, then create a new assertion pointing at the correct target.

Why this matters for design: the `about` **arity** — whether an assertion is about a single thing, an Arc, a Bond, a Set, or a List — is *permanent for any data already written*. (We use *arity*, not "cardinality": this is the structure of the relationship the assertion makes, not a relational one-to-many count.) The four-direction test (above) must be run before data lands, not after.

### `about` as the navigation axis

From the docs:

> **The about target determines what you'll browse by.** If you assert about `Company/acme`, you can later query "everything we believe about Acme." If you instead assert about `Filing/acme/10-k/2024`, your beliefs cluster around individual filings — a different navigation axis.

Choose based on **what will you most often want to ask "what do we know about X?" for**. The `about` arity decision is not just a foreign-key choice; it's the design of your traversal surface.

### About targets must exist at commit time

The write pipeline verifies that the `about` target exists. If it doesn't, the assertion fails with NOT_FOUND. To create-and-assert atomically, put both ops in a single commit:

```bash
wh commit submit --ops '[
  {"operation": "add", "kind": "thing", "name": "Company/acme", "data": {"industry": "fintech"}},
  {"operation": "add", "kind": "assertion", "name": "Thesis/acme-bull", "about": "Company/acme", "data": {"outlook": "bullish"}}
]' -m "Add company with initial thesis"
```

### When the primitive cannot be emitted yet

Sometimes the design primitive is clear but the current write path cannot emit it yet: for example,
the approved design needs an Arc/Bond/Set relationship assertion, but the importer, connector, or
platform surface can only write Things plus scalar payload fields today. Do not fake the edge.

Use this disciplined retreat:

1. **Verify the write path first.** Run the smallest live probe that exercises the exact primitive:
   shape registered, target Things present, one add operation written, and one readback traversal
   checked. A local type-check or generated ops file is not enough.
2. **If the primitive is unsupported, ship only inert staging data.** Write the durable Things and
   plain string join keys laid out 1:1 with the eventual relationship members. Name the fields as raw
   or pending keys (`targetRawKey`, `targetIdHint`) and describe them as non-traversable. Do not put an
   unresolved value in a `wref` field and do not create an assertion whose `about` points at only one
   endpoint while pretending the other endpoint is graph-traversable.
3. **Record the retreat triple next to the shape and ingestion plan:**
   - accepted pitfall: the exact primitive the pipeline cannot currently emit;
   - migration trigger: the platform or connector capability that makes the real edge writable;
   - re-derivable: the deterministic source fields needed to backfill the real Arc/Bond/Set/List.
4. **Plan the migration before loading volume.** The staged keys must be sufficient to derive stable
   relationship names later. When the trigger lands, replay into the approved primitive and remove the
   staging fields from new writes.

This is a temporary write-path compromise, not an alternate graph design. The four-direction test is
still run against the eventual relationship. Until the relationship is emitted and runtime-verified,
the graph remains alpha for any query that depends on that edge.

### Put identifying data in the payload too

From the docs:

> **Don't rely solely on the about wref to carry key identifiers.** If an assertion is about `Company/acme`, include the company name or ticker in the assertion's data too — this makes the assertion self-describing when read in isolation, without requiring a follow-up query to resolve the about target.

This is a context-free-legibility rule — mirror identifying data onto the assertion so it reads on its own — and it compounds with the collection-mirroring rule below.

---

## Collections — Arc, Bond, Set, List

WarmHub's public collection forms are auto-created on first use, version-pinned, idempotent, and composable (collections can contain collections).

| Type | Ordered? | Unique? | # of things | Field names | Use when… |
|---|---|---|---|---|---|
| **Arc** | semantic direction | yes | 2 | `from`, `to` | Directed binary relationship (A → B differs from B → A) |
| **Bond** | no | yes | 2 | `ends` | Symmetric binary relationship; `{A, B}` is one edge |
| **Set** | no | yes | 1+ | `members` | Mechanical symmetric or n-way grouping |
| **List** | yes | no | 1+ | `items` | Ordered sequence with possible duplicates |

### Choosing Arc or Bond

Ask whether reversing the two endpoints changes the relationship.

- **Arc:** `Service/A blocks Service/B` has `from: Service/A` and `to: Service/B`; reversing it says that B blocks A, which is a different fact.
- **Bond:** `Ticket/123 duplicates Ticket/456` has two `ends`; reversing the input names the same duplicate relationship, not a second fact.

Never use input order as a direction on a Bond: its ends are canonicalized. Use Arc whenever each endpoint has a distinct semantic role.

Arc and Bond require two distinct durable identities. Pair remains readable and writable for compatibility, but new models must use Arc or Bond; its `first` / `second` order is not promoted as relationship vocabulary.

Existing Pair data is not automatically migrated, aliased, backfilled, or write-blocked. If a content owner intentionally remodels a directed Pair as an Arc, create the replacement Arc and assertions, then retract the old Pair in the same commit so one logical edge does not have two active relationship subjects.

For a genuine three-way relation, don't reach for a collection at all — model it as a named domain shape or assertion with its own fields. Reserve `set`/`list` for mechanical grouping of three or more things where no directional or ordering semantics are load-bearing.

### Inline syntax

`about` accepts a **wref string only.** There is no inline tagged-object sugar (`{ arc: [...] }`, `{ bond: [...] }`, `{ set: [...] }`, `{ list: [...] }`) — the write pipeline rejects it. To assert about a collection, create the named collection first with its own `add` operation, then point `about` at the resulting wref:

```bash
wh commit submit --ops '[
  {"operation": "add", "kind": "collection", "type": "arc", "name": "vent-resolution-x", "members": ["Vent/X", "Workaround/Y"]},
  {"operation": "add", "kind": "assertion", "name": "Resolution/vent-x", "about": "Arc/vent-resolution-x", "data": {}}
]' -m "Add vent resolution"
```

```js
about: "Location/A"           // single thing
about: "Arc/vent-resolution-x"    // directed binary relationship
about: "Bond/duplicate-a-b"        // symmetric binary relationship
about: "Set/cell-adjacency-0-0-0-1"  // Set, created by a prior collection op
about: "List/cell-path-a"     // List, created by a prior collection op
```

Valid collection `type` values on the `add`/`kind: "collection"` op are `arc`, `bond`, `set`, and `list`. `pair` is accepted only for compatibility. Collection names must not contain `+`; use a readable slug instead.

### Querying through collections

By default, `wh thing about <X>` returns assertions whose `about` is exactly `<X>`. Assertions whose `about` is a collection containing `<X>` are **not** returned without an explicit flag:

```bash
wh thing about Location/A                       # direct only
wh thing about Location/A --resolve-collections # also includes Arc/Bond/Set/etc. containing A
wh thing about Location/A --resolve-collections --role from # Arc source-side only
```

Collection resolution is HEAD-only — it finds collections that currently contain the thing. It does not resolve historical memberships.

This is the critical operational caveat: a graph can be designed correctly with `about` referencing a named Arc or Bond collection and still appear empty from an endpoint's side if the query forgets `--resolve-collections`. Use `--role from|to|ends` when a query needs a specific Arc direction or Bond membership. Document this in shape descriptions and tooling expectations.

### Composability

Collections are things, so they can be members of other collections:

```js
// Arc/location-ab and Arc/location-cd are themselves named collections
// created by prior ops; the outer Arc collection is created from those two wrefs
about: "Arc/<outer-name>"   // an Arc whose endpoints are collection wrefs
```

Useful for hierarchical or nested relationships, but pay the readability cost — multi-level composition can be hard to follow without good descriptions.

---

## Context-Free Legibility (mirrored fields)

When `about` is an Arc / Bond / Set / List, context-free readers traversing the graph need help understanding what the assertion is *about* without resolving the collection's members. Mirror the practical traversal fields onto the assertion:

```js
// Native traversal target — named Arc collection created by a prior op
about: "Arc/<basis-name>"   // e.g. Arc/reviewedclaim-x-arxiv-2601-03192, over ["ReviewedClaim/X", "ExternalSourceReference/arxiv-2601.03192"]

// Mirrored fields on the assertion's data (context-free legibility)
data: {
  claimWref: "ReviewedClaim/X",
  sourceWref: "ExternalSourceReference/arxiv-2601.03192",
  sourceKind: "arxiv",
  sourceIdentityKey: "2601.03192",
  // ... plus the actual basis-payload fields
}
```

The native Arc traversal stays — but the mirrored fields make the assertion legible *without* resolving the Arc. This addresses the "MCP reader sees no source grounding" failure mode — an actual incident observed in a literature-review WarmHub graph (the kind of repo that curates claims drawn from external papers and Git artifacts), where readers traversing to a basis assertion couldn't tell the subject claim from the evidence source until the fields were mirrored.

---

## BDU and the binomial-opinion constraint

**BDU** is shorthand for **belief / disbelief / uncertainty** — a *subjective-logic opinion triple*, sometimes written `(b, d, u, α)` with a base-rate prior `α`. It's WarmHub's canonical way of attaching per-assertion uncertainty: how strongly an assertion is believed true, how strongly disbelieved, residual uncertainty that doesn't commit either way, and the base rate. Throughout this skill, **"BDU on assertion truth"** means the triple lives on the assertion itself; **"BDU on edges"** means it lives on a relationship assertion (one whose `about` is an Arc, Bond, Set, or List of things).

From the docs:

> **If an assertion carries a subjective-logic opinion `(b, d, u, α)`, the underlying claim must be a binary proposition (true/false).**

This is a constraint, not just a guideline. Belief / disbelief / uncertainty / base-rate triples are semantically defined for binary propositions. Putting BDU on a continuous concept ("how relevant is this lesson to that topic?") looks reasonable but produces opinion arithmetic that is hard to interpret consistently across actors.

If your uncertainty is non-binary:

- **Use a confidence score** (a single `confidence: number` field) for point-estimate uncertainty.
- **Use distinct binary propositions** if you can decompose ("relevant to topic X: yes/no" with separate BDU per topic).
- **Use a separate confidence-bearing assertion shape** rather than shoehorning BDU onto a continuous concept.

The choice of *where* BDU lives — on the assertion itself (a literature-review pattern: `CertaintyOpinion` about `ReviewedClaim`), on a relationship edge (a knowledge-accumulation pattern: `Learning.relevance` connecting `Topic` and `Lesson` — non-canonical because relevance isn't strictly binary), consolidated by Veritas across multiple source opinions, or absent (when point-estimates suffice) — is itself a design decision worth making explicitly. See `dimensions.md` § D8. If the design needs reputation-weighted consensus across sources, read [../../veritas-design/SKILL.md](../../veritas-design/SKILL.md). If it only needs operator math, use `subjective-logic` when installed.

---

## When in doubt

If a primitive choice seems forced or awkward:

1. **The four-direction test is your friend.** Run it before defining the shape. The `about` arity that makes all four directions work is the right one.
2. **`about` is immutable; descriptions are not.** Get `about` right at design time. Descriptions can be improved over time.
3. **Things and Assertions answer different questions.** "What's true about X?" → thing. "What does Y believe about X?" → assertion.
4. **Collections aren't fancy — they're free.** Auto-created, idempotent, version-pinned. Use them whenever a relationship has more than one endpoint.
5. **The docs are canonical.** When in doubt, [docs.warmhub.ai/data-modeling](https://docs.warmhub.ai/data-modeling/overview/) is authoritative; this file is design judgment that builds on it.
