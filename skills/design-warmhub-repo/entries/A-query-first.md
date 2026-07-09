# Entry A — Query-First Design

> **Best when.** Multiple stakeholders need alignment on what the graph is for. Domain is broad, ambiguous, or contested. Anti-sprawl pressure dominates ("we need to stop adding shapes nobody uses"). Designer has graph-design experience and is comfortable working pre-shape.
>
> **Real risk.** Abstract; intimidating without prior exposure to the technique. Slow upfront ramp before any shape exists. Beginners can stall trying to enumerate every future question.

---

## The principle

Write the questions the graph must answer **before** any shape exists. Then let each shape **earn pressure for its existence** by enabling specific questions. A shape that serves no question is suspect; a question that stays important but blocked creates pressure for a new shape, source signal, or ingestion stage.

This is the discipline-by-construction entry. The graph doesn't sprawl because every shape pays for itself in question-coverage from the moment it lands.

Two real-world exemplars are the easiest way to see the discipline in action. Either one is enough to internalize the pattern.

- **A literature-review research wiki's query north-star** — the catalog written before any shape existed for a research wiki whose underlying WarmHub graph curates claims drawn from external papers and Git artifacts. The canonical phrase from that document captures the rule: *"This note is deliberately pre-shape. Concrete shapes should follow from this catalog, not precede it."*
- **A defect-prevention atlas's query catalog** — the 39-query north-star for a defect-prevention atlas, where every shape, evaluator, and signal cites the Q IDs it serves.

These illustrate the catalog format described in [`references/query-catalog-template.md`](../references/query-catalog-template.md). The template alone is sufficient to start.

## Workflow

### 1. Write the audience-question catalog

Group questions by audience: who is asking, and what do they want to know? Common audience clusters:

- **Forensics** ("I'm looking at X. Tell me what we know.") — single-object deep dives.
- **Class intelligence** ("What patterns recur across cases?") — cross-case aggregations.
- **Lifecycle** ("What's this remedy / claim / proposal's status?") — single-object timeline.
- **Forward propagation** ("Something new happened. What does the graph have to say?") — reactive queries.
- **Methodology meta** ("Is the system working?") — graph self-diagnostics.

For each audience cluster, write 5–15 specific questions. Concrete is better than abstract; specific is better than general.

### 2. Format every question as a runnable contract

Use this template (lifted from the two exemplars above):

```
### Q§.N — <question in plain language>

Status: [R] runnable | [M] missing data, no new shape required | [F] future shape required

Traversal sketch:

  wh thing about <X> --shape <Y>
    -> <field/edge>
    -> <next traversal step>

Earns pressure for: <Shape1>, <Shape2>, <field on existing shape>

<Optional: 1–2 sentences on what this query unlocks that text search can't do.>
```

The **Earns pressure for** line is load-bearing. It names the shapes whose existence is justified by *this query's existence*. If a query earns pressure for nothing, it might already be answerable by existing shapes (good — note that). If a shape doesn't appear on any "Earns pressure for" line, it's a candidate for retirement.

The **Status legend** keeps you honest about what's actually answerable today:
- `[R]` runnable against existing data and shapes.
- `[M]` blocked on data ingestion or fixture work, but no conceptual shape gap.
- `[F]` blocked on a missing shape or assertion family that doesn't yet exist.

### 3. Add anti-queries

A short section at the end of the catalog: questions the graph **explicitly declines to optimize for**, with reasons. Examples from a defect-prevention atlas's catalog:

- "Who personally introduced this defect?" — process gaps, not person-blame.
- "Which reviewer should have caught this?" — same.
- "Is the prompt change the best remedy?" (without alternatives generated and backtested) — anti-prompt-accretion.

Anti-queries convert "shouldn't we ask about X?" from a recurring derail into a one-line response.

### 4. Run the four-direction traversability test on each `[F]` query

Before designing the shape that would unblock an `[F]` query, walk through the [four-direction test in primitives.md](../../modeling-foundations/references/primitives.md). For an assertion-bearing relationship:

1. From the subject side, can a query answer it?
2. From the object side, can a query answer it?
3. As an aggregation across the assertion type?
4. As a derived rollup combining hops?

If any direction would need a field-string-match, the `about` arity you're imagining is wrong. Choose Pair / Set / List per the rules in primitives.md *before* writing the shape.

### 5. Now diagnose the dimensions

The catalog has revealed the *kind of pressure* your domain creates. Run [dimensions.md](../../modeling-foundations/references/dimensions.md) — the answers should fall out of the catalog rather than being elicited from scratch. The catalog's audience questions reveal D5 (evaluation unit), D6 (continuous evidence), D2 (origination), and so on.

### 6. Match a fingerprint and adopt vocabulary

Open [pattern-catalog.md](../references/pattern-catalog.md). Match the closest fingerprint to your dimensions answers. Adopt the family's *abstract* shape vocabulary, not the literal names. Translate to your domain's nouns.

### 7. Apply the universal foundations

Read [design-rules.md](../../modeling-foundations/references/design-rules.md). Apply each rule. Hierarchical naming, descriptions on every shape and field, append-only revision, no debt-shapes, context-free legibility where Pair/Set targets are used.

### 8. Walk pitfalls and reach the checkpoint

Read [pitfalls.md](../../modeling-foundations/references/pitfalls.md) for entries matching your fingerprint. Fix any anticipated failure modes at the shape layer. Then walk through [checkpoint.md](../references/checkpoint.md) — five questions, all five must answer cleanly.

## What this entry buys you

- **Shape sprawl is impossible by construction.** Adding a shape requires citing the Q(s) it unlocks; if you can't, you don't add the shape.
- **Stakeholder alignment is forced upfront.** The catalog is the contract; reviewers can debate questions before debating shapes.
- **Retirement is a clean operation.** When a query is sunset, the shapes it depended on become candidates for sunset too.
- **Traversability is automatic.** The four-direction test is a per-query exercise during catalog drafting, not an afterthought during shape design.

## What this entry costs you

- **Slow first day.** You'll spend hours writing questions before any shape exists. This is the discipline tax.
- **Imagination of unknowns.** Some queries you'll need won't be obvious until you have data. Mitigate by leaving `[F]` placeholders and adding queries as the domain reveals them.
- **Pedagogical barrier.** This entry is hardest for first-time WarmHub designers. If you're new, consider entry B (entities-first) and run the catalog as a post-hoc audit.

## Common variants

- **Pain-point-first.** A subform of query-first, but starting from concrete pain ("where is text search failing me today?") rather than abstract enumeration. Often a friendlier on-ramp for the same destination.
- **Decision-first.** Another subform — start from "what decisions does this graph need to enable?" and reverse-engineer queries. Useful when the graph exists to support a specific operational workflow.

Both produce a query catalog with the same structure as the literature-review research-wiki exemplar above.

## When to switch entries mid-stream

If you're 30 minutes into entry A and finding yourself unable to articulate audience questions because the entities are still vague, switch to **entry B (entities-first)**. Sketch the nouns, then return to entry A with concrete entities to ask questions about.

If you're 30 minutes in and recognize the domain as a clear analog of an existing repo (e.g., "this is just like a vent-tracking graph but for build failures"), switch to **entry C (pattern-match)**. Adapt the analog's structure, then audit it post-hoc with a query catalog.

---

## Next

After completing the workflow above, all paths converge at [references/checkpoint.md](../references/checkpoint.md). Don't skip it; the catalog discipline you just applied passes question 1 by construction, but questions 2–5 still need to be walked deliberately.
