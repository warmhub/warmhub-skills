# Entry B — Entities-First Design

> **Best when.** Concrete domain you already know cold (you can name the nouns without thinking). Solo designer or clear authority. Need fast time-to-first-shape (a working manifest in a day, not a week). The canonical Things-vs-Assertions framing in [docs.warmhub.ai](https://docs.warmhub.ai/data-modeling/overview/) maps cleanly to your domain.
>
> **Real risk.** Shape sprawl without external discipline — without an audit pass, you'll add shapes "for completeness" that never serve a question. Premature abstraction. Over-modeling relationships that don't actually need to be queryable.

---

## The principle

Start with the canonical primitives — **Things** (entities with a single canonical state) vs **Assertions** (claims with attribution, confidence, or multiple perspectives). Identify the nouns. Identify what you say *about* the nouns. Derive the queries naturally from "what would I want to know about this?".

This is the discipline-by-audit entry. Shapes come fast because you already know the domain; the rigor comes from a post-hoc question-coverage audit before adoption.

The canonical reference is [docs.warmhub.ai data-modeling](https://docs.warmhub.ai/data-modeling/overview/), specifically:

> **Use things when you're modeling entities with a single canonical state — the objects your system reasons about. A company, a sensor, a document. If there's one truth about this entity, it's a thing.**
>
> **Use assertions when attribution, confidence, or multiple perspectives matter — when you need to know *who* said something about an entity, not just the current state.**

## Workflow

### 1. List the nouns

Write down every entity in your domain. For each, decide thing or assertion using the docs' test:

| Use a thing for | Use an assertion for |
|---|---|
| Single canonical state ("one truth about X") | Multiple perspectives, attribution, confidence |
| Lookup tables, configuration, identity proxies | Claims, opinions, evaluations, classifications |
| Internal artifacts you generate | Provenance / basis / decision events |

Don't reach for assertions just to track change over time — things are versioned natively. Reach for assertions when *who said it* matters.

### 2. Sketch the manifest

For each thing or assertion, write a one-line description and 3–8 fields. Don't worry about completeness — get the nouns down. Naming convention: `<Shape>/<stable-id>`, hierarchical when natural (`<Shape>/<batch>/<target-id>`), no mutable state in names.

Read [primitives.md](../../modeling-foundations/references/primitives.md) before going further. The traversability contract — and especially the rule about `about` being immutable — affects every arity decision you're about to make.

### 3. Decide the `about` arity for every assertion

For each assertion shape, walk the four-direction test from primitives.md:

1. **Subject side.** From the assertion's primary subject, can `wh thing about <subject>` return it?
2. **Object side.** If the assertion is *between* two things, can the *other* endpoint also see it?
3. **Aggregation.** Can `wh assertion list --shape <Foo>` find all assertions of this kind?
4. **Derived rollups.** Do multi-hop questions ("vents addressed by any workaround") fall out as graph walks?

If a relationship is between two things, the answer is almost never `about: <single-thing>` with the second endpoint as a flat string field. That's a classic single-thing-arity failure. The right answer is one of:

- **Pair** for directional 2-way relationships ("A blocks B" — A and B are different roles).
- **Set** for symmetric 2-way or n-way relationships ("A and B are duplicates of each other" — order doesn't matter).
- **List** for ordered sequences with possible duplicates.

A genuine ordered 3-way relation (player + cell + item) is not one of the collection primitives — model it as a named domain shape/assertion whose name encodes the axes. Mechanical 3-way grouping without load-bearing order can use List or Set instead.

Get this right *now*. `about` is immutable; arity changes after data lands require retract-and-replay.

### 4. Add descriptions

Every shape gets a `description`. Every field gets a `description`. This is part of the shape, not documentation.

For each shape, the description should answer:
- What does this represent? Is it a thing, an authored assertion, a source proxy, or an event?
- When should an agent create it? When should they not?
- What confusion should an agent avoid? (e.g., "this is the *evidence source*, not the *subject*")

For each field, the description should answer:
- What does this identify or assert?
- Is the value identity, provenance, evidence, interpretation, certainty, or a mirrored field for context-free legibility?
- Which shape or external identity does it point to, if any?

Skip this step and `describeRepo` will produce output that no external agent can read. The skill audited 7 real WarmHub repos and the ones with full descriptions were universally easier to onboard.

### 5. Audit your shapes against the question-coverage test

Now you do the discipline pass. For each shape:

- Write down 1–3 questions the shape exists to answer.
- If you can't articulate a question, the shape is suspect — defer or delete.
- For each question, check: does it resolve as a graph traversal (`wh thing about`, `wh thing refs`, `wh thing query`, with optional `--resolve-collections`)? Or would it require a field-string match?
- If field-string match is required, the `about` arity is wrong (see step 3).

This is the same test entry A applies upfront. You're applying it as an audit. Equally valid; just shifted in time.

### 6. Diagnose the dimensions

Run [dimensions.md](../../modeling-foundations/references/dimensions.md). The answers should be quick by now — you have concrete shapes and example data in mind.

### 7. Match a fingerprint, walk pitfalls, reach the checkpoint

Open [pattern-catalog.md](../references/pattern-catalog.md), find the closest fingerprint, read the "where it fails when transplanted" notes for your match. Open [pitfalls.md](../../modeling-foundations/references/pitfalls.md), walk the entries for your fingerprint. Then walk [checkpoint.md](../references/checkpoint.md) — five questions, all five must answer cleanly.

## What this entry buys you

- **Fast.** You can have a draft manifest in an afternoon if the domain is concrete.
- **Concrete.** Naming the nouns is easier than enumerating future questions.
- **Maps to existing knowledge.** ER modeling, schema-first DDD, OOP — most designers come pre-trained for entity-first thinking.
- **Lower cognitive barrier.** First-time WarmHub designers can ship something useful here without internalizing the full query-first discipline upfront (see entry A for that).

## What this entry costs you

- **Sprawl risk.** Without the post-hoc audit (step 5), you'll keep adding shapes and never retire them. Run the audit before adoption.
- **Late-discovery arity bugs.** If you skip the four-direction test in step 3, you'll discover wrong-arity assertions after data has loaded — expensive to retract-and-replay. Don't skip step 3.
- **Risk of premature abstraction.** Entity modelers sometimes invent `Generic*` and `Abstract*` shapes that anticipate variations the domain doesn't have. Resist; add only what serves a current question.

## When to switch entries mid-stream

If step 5 (the question-coverage audit) is making you delete more than half your shapes, you're really doing entry A in disguise — switch to it. Re-do step 5 as the *primary* exercise, draft the catalog properly, then come back to shape design.

If step 4 (descriptions) is hard because you're not sure what each shape is *for*, the domain isn't as concrete as you thought. Switch to **entry C (pattern-match)** to find a similar known-good design as a vocabulary anchor.

If step 3 (`about` arity) is producing nonsense answers — e.g., a relationship has more endpoints than Pair or Set can express — pause and read [primitives.md § Collections](../../modeling-foundations/references/primitives.md#collections--pair-set-list) carefully. The three collection types cover most cases; if none fits, you likely have a genuine 3-or-more-way relation that wants a named domain shape/assertion rather than a collection primitive, or a multi-relationship situation that decomposes into multiple assertion shapes.

---

## Next

After completing the workflow above, all paths converge at [references/checkpoint.md](../references/checkpoint.md). Question 1 (every shape cites a question) is the one this entry handles by audit rather than by construction — make sure the audit was real, not perfunctory.
