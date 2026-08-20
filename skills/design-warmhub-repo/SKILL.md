---
name: design-warmhub-repo
description: Design or review WarmHub repositories — shapes, assertions, source identity, certainty, derivation policy, adoption gates, and graph query workflows. Use when creating a new WarmHub repo, deciding durable shape versus derived query, choosing which assertion-pattern family fits the domain, modeling source/provenance semantics, designing the about-arity of relationship assertions (single thing / Arc / Bond / Set / List), planning a synthesize-and-test, claim-review, or governance graph, or judging whether a graph is ready for adoption. Also fires on "design a knowledge graph," "model this as shapes," "what should the assertions look like," or "is this repo ready to ship."
---

# WarmHub Repo Design

Use this skill to design WarmHub repos that earn their complexity, survive append-only revision, and remain useful to context-free graph readers.

## Inputs

Prefer a `.warmhub-builder/project-state.json` manifest initialized by `warmhub-builder`. Also accept
project intake notes, existing repo facts from `discover-warmhub-repo`, source notes, or a pasted
problem statement.

## Output Contract

Produce or update `repoDesignSummary` in the manifest using the shared contract in
[warmhub-builder/references/repo-design-summary.md](../warmhub-builder/references/repo-design-summary.md).
At minimum, record the shape inventory, identity model, every assertion shape's
`aboutCardinality`, four-direction traversal result, update cadence, write model, QC model, and
sensitivity. If the manifest is not writable, return the same structure in the response and name
the missing path or blocker.

## What a finished, well-designed graph looks like

Whichever path got you there, every well-designed WarmHub repo has the same five properties at adoption time:

1. **Every shape cites at least one question it serves.** Shapes that earn no question are deferred or deleted.
2. **Every load-bearing question resolves as a graph traversal**, not a field-string match. The four-direction test (subject side / object side / aggregation / derived rollup) passes for every assertion shape.
3. **Things, assertions, and collections are used correctly per the canonical primitives** (see [docs.warmhub.ai data-modeling](https://docs.warmhub.ai/data-modeling/overview/)). The `about` target — single thing, Arc, Bond, Set, or List — is whichever one makes the four-direction test pass.
4. **Universal foundations apply.** Hierarchical names that carry identity not metadata — a `/`-delimited scope hierarchy humans navigate visually and humans/agents glob-query by prefix (no mutable state, no provenance tags in names) — shape and field descriptions on every shape, append-only revision, no debt-shapes, mirrored fields where collection targets need context-free legibility.
5. **Pitfalls walked for the matched fingerprint.** Mechanism mismatch, terminal-adoption trap, vocab leakage, arity mismatch, materialization leakage, etc.

This is the **convergence checkpoint**. See [references/checkpoint.md](references/checkpoint.md) for the gate questions in detail. Adoption is gated on this checkpoint passing, not on any particular path getting you there.

## Choose your entry

There are five genuinely valid starting points for WarmHub graph design. They have real and different ergonomics; pick consciously based on where you actually are right now. None is universally best. The first four are for initial design; the fifth is for diagnosing a populated graph that's already in flight.

| Entry | Best when | Real risk | Start with |
|---|---|---|---|
| **A. Query-first** | Multiple stakeholders need alignment; broad/ambiguous domain; anti-sprawl pressure dominates; graph design experience present | Abstract; intimidating without prior exposure; slow upfront ramp before any shape exists | [entries/A-query-first.md](entries/A-query-first.md) |
| **B. Entities-first** | Concrete domain you already know cold; solo designer or clear authority; need fast time-to-first-shape; nouns are obvious | Shape sprawl without external discipline; over-modeling; premature abstraction | [entries/B-entities-first.md](entries/B-entities-first.md) |
| **C. Pattern-match** | Domain clearly resembles an existing successful WarmHub repo; team has bandwidth for translation work | Cargo-cult; transplant misfit; vocabulary leakage; missing the destination repo's fingerprint-specific design questions | [entries/C-pattern-match.md](entries/C-pattern-match.md) |
| **D. Sources-first** | Most or all assertion-targets are external (papers, tickets, code, services, runs); identity-stability is the dominant first concern | Doesn't generalize when sources are graph-internal; can stop at proxy modeling without reaching the assertion design | [entries/D-sources-first.md](entries/D-sources-first.md) |
| **E. Post-hoc-audit-first** | Schema already in production; read-side friction is showing up; need to localize whether the problem lives in the schema (upstream) or the read-path (downstream) before committing to a fix | Treating the audit as a debugging tool rather than design discipline; a clean audit is a diagnosis, not a fix | [entries/E-post-hoc-audit.md](entries/E-post-hoc-audit.md) |

These aren't "pick whichever you like." They're real fits for real situations. A senior architect with a brown-field migration and three teams disagreeing on what the graph is for: A. A solo founder modeling a familiar domain: B. Someone porting a known-good design to a new vertical: C. Someone whose entire job is to ingest external data and assert about it: D. Someone with a populated graph and confusing read-side friction: E.

If two entries fit, you can run them in sequence (e.g., A then C — write the queries, then look for a fingerprint match that matches the question pressure). They converge at the same checkpoint regardless. Entry E in particular is the convergence checkpoint run as a fault-localizer — it reuses the same five gates from a different posture.

## Reading order

If you've never designed a WarmHub repo before, read in this order before picking an entry:

1. The "What a finished, well-designed graph looks like" section above (you just read it).
2. [modeling-foundations/references/primitives.md](../modeling-foundations/references/primitives.md) — Things vs Assertions vs Collections, the immutable `about`, the traversability contract. **This is foundational and applies to every entry.**
3. The four entry orientations above. Pick one based on your situation, read it.
4. From your entry's "next" section, walk to: the [pattern catalog](references/pattern-catalog.md), the [dimensions diagnostic](../modeling-foundations/references/dimensions.md), the [universal foundations](../modeling-foundations/references/design-rules.md) (and [naming.md](references/naming.md) for the naming half in depth), the [pitfalls list](../modeling-foundations/references/pitfalls.md), and finally the [convergence checkpoint](references/checkpoint.md).

If you've designed WarmHub repos before, you can skip primitives.md and pick your entry directly. The checkpoint is what you're aiming for; the entry is the on-ramp.

## When to read which reference

- **Always read first.** [modeling-foundations/references/primitives.md](../modeling-foundations/references/primitives.md) if you're hazy on Things vs Assertions vs Collections, or on what `about` arity choices imply for traversability.
- **Picking the entry that suits you.** The table above and the four `entries/*.md` files.
- **Diagnosing the kind of graph you're designing.** [modeling-foundations/references/dimensions.md](../modeling-foundations/references/dimensions.md) — 9-question diagnostic (3 of which carry a sub-axis) that classifies the pressure your domain creates and indexes into the catalog. Run this from any entry.
- **Finding a similar successful design.** [references/pattern-catalog.md](references/pattern-catalog.md) — model families with fingerprint + load-bearing shapes + why-this-works + where-it-fails-when-transplanted.
- **Naming, descriptions, append-only, context-free legibility, verify-before-encoding, debt-vs-query, question-catalog discipline.** [modeling-foundations/references/design-rules.md](../modeling-foundations/references/design-rules.md).
- **Naming rigor in depth — why names are the load-bearing UX, one-authority/convergent identity, glob-queryable hierarchies, deterministic vs content-addressed leaves.** [references/naming.md](references/naming.md). Read whenever a graph will have many instances, multiple producers writing the "same" entity, or analytical/glob access patterns — names are identity and immutable, so getting them right is cheap at design time and a retract-and-replay migration to fix later. Includes a worked example of a multi-producer code-review quality graph.
- **Cross-repo linkage — the consolidated checklist + the lifecycle/orphan prompts a cross-repo link must answer.** [modeling-foundations/references/cross-repo-linkage.md](../modeling-foundations/references/cross-repo-linkage.md). Read whenever a relationship's endpoints live in different repos (a consumer referencing a shared substrate, an analytical layer over an upstream catalog, a host-resolved link). Covers which side owns the wref, never publishing unresolved strings in wref-typed fields, the unresolved-target policy, and target-retraction / identity-merge / stable-join-key decisions. Builds on the primitives repo-boundary note and Pattern #12.
- **Write-path limits before design solidifies.** [modeling-foundations/references/primitives.md](../modeling-foundations/references/primitives.md) § "When the primitive cannot be emitted yet" and [plan-warmhub-ingestion](../plan-warmhub-ingestion/SKILL.md). Read when the ideal graph primitive is known but the current importer/connector may not be able to emit Arc/Bond/Set/List or typed wref fields yet.
- **Failure modes keyed by dimension.** [modeling-foundations/references/pitfalls.md](../modeling-foundations/references/pitfalls.md) — symptom-to-dimension index at the bottom.
- **Migrating an existing populated graph** (because `about` arity, shape semantics, or subject changed mid-flight). [build-warmhub-repo/references/migrations.md](../build-warmhub-repo/references/migrations.md) — retract-and-replay discipline with cascade through dependent assertions whose own `about` is also immutable. Read when applying a v2 design to a graph that already has v1 data.
- **Field-level shape review — entity discovery (a wide shape is usually several entities flattened into one).** [modeling-foundations/references/field-level-design.md](../modeling-foundations/references/field-level-design.md) — the sibling lens to the four-direction test. Catches defects that don't break traversals: shapes that have swallowed other entities (a district name copied onto 9M voters is a hidden `Precinct`), twin-encoded fields (`_desc`/`_abbrv`), sparse sub-entity fields, time-relative rot (`age_at_year_end`), unparsed source strings, Y/N flags as one-character strings, an over-wide filter surface. Apply whenever a shape carries > ~25 fields, or any shape at > 100K instances, or you're ingesting from a flattened source. Worked example: the 66-field NC voters `Voter` shape split into `Voter` + `Precinct` + `DistrictAssignment` + `County`.
- **The five gate questions before adoption.** [references/checkpoint.md](references/checkpoint.md).
- **Per-fingerprint context-free reader eval templates (Gate 5 made concrete).** [references/context-free-reader-evals.md](references/context-free-reader-evals.md) — placeholders + canned questions per pattern in the catalog. Fill in your project's wrefs and run via `wh` to discharge Gate 5 as a deterministic eval rather than as prose discipline.
- **Callable validators (Gate 1 and Gate 2 made deterministic).** [build-warmhub-repo/scripts/verify-relationships.mjs](../build-warmhub-repo/scripts/verify-relationships.mjs) (Gate 2: dry-run for 2a design-time pass; full-run for 2b runtime-verified pass) and [scripts/verify-catalog.mjs](scripts/verify-catalog.mjs) (Gate 1: reconciles shapes against question catalog). Wire into pre-commit / pre-publish flows.

## Smell tests (quick gates that pre-empt deep work)

These are quick gut-checks worth running before going deep on any entry:

- **The graph owns source bytes** (it stores PDFs, full file contents, ticket text as the canonical copy). Likely wrong. See `design-rules.md` § Source Ownership.
- **A shape's name encodes mutable state** (`ReviewTarget/rank-1`, `Claim/needs-support`). Likely wrong. See `design-rules.md` § Hierarchical Thing Names.
- **A name encodes provenance or context** (loader tag, source, harness: `Finding/nightly-import-142-…`). Wrong — that's assertion data. Two producers describing the same entity must compute the *same* name. See `naming.md` § Principle 1.
- **Two producers (or lanes) format the "same" thing's name differently** (`src/cart.ts` vs `web/src/cart.ts`). Identity has silently forked into two nodes; the four-direction test passes on each. Needs one naming authority with input canonicalization. See `naming.md` § Principle 3–4.
- **Names are flat/opaque on a shape that will have many instances or analytical access** (`Finding/<uuid>`). Loses visual navigation and glob-query; blocks sample-first batch-fetch. See `naming.md`.
- **A shape exists to track "still needs work"** (debt, queue, todo). Likely wrong — query, not shape. See `design-rules.md` § Shape Vs Query.
- **An assertion shape uses `about: <single thing>` for what is structurally a relationship between two things, with the second thing as a flat string field.** Wrong. The relationship is invisible from one of the two endpoints because `about` is immutable and the flat field doesn't traverse. See `primitives.md` § Traversability Contract.
- **A relationship crosses a repo boundary and the design expects reverse `wh thing about` to find it.** Reverse `about` is repo-local — it silently returns 0 across repos, so the four-direction test looks like it "fails" and tempts you to contort the schema. Cross-repo links want a typed wref field traversed via `wh thing refs --inbound` (Pattern #12). See `primitives.md` § The four-direction test across a repo boundary, and the full checklist + lifecycle prompts in `cross-repo-linkage.md`.
- **The design encodes a belief about a platform mechanism — resolution scope, validation scope, field-type support, index behavior — that nobody actually ran.** Likely wrong, and likely contorting the schema around an imaginary constraint. Run a 60-second throwaway-two-repo probe first. See `design-rules.md` § Verify Platform Mechanisms Before Encoding.
- **The source shape was designed from docs but not from actual rows** (`head -2`, sample API payload, or fixture absent). Likely wrong. Before defining fields, inspect representative source rows and confirm every load-bearing field exists in the real source and has the expected grain.
- **A design needs a relationship primitive the write path cannot currently emit.** Do not fake it with a one-sided assertion plus string endpoint. Stage inert raw keys only if you also record the accepted pitfall, migration trigger, and re-derivable source fields. See `primitives.md` § When the primitive cannot be emitted yet.
- **A multi-valued field is stored as a JSON-stringified list in a single string field** (`evidence_ids: "[...]"`). Wrong twice over — the members don't traverse (the A5 flat-string failure), and it's unnecessary: native `array` types exist, including `wref` arrays whose members each reverse-traverse via `refs --inbound` (cross-repo). Use a native array or a relationship assertion. See `field-level-design.md` § Multi-valued fields.
- **A derived metric is kept out of the graph because "recompute means a retract-and-re-add dance."** Usually a misread that over-fears write-back. A deterministically-named, single-`about` metric refreshes with `revise` (cheap, tier 1); only a shape/`about`-arity change is the expensive tier. See `design-rules.md` § The recompute cost ladder.
- **Adoption is a one-way switch** with no shape for "did it keep working." Likely wrong if the domain has continuous external evidence. See `pitfalls.md` § Terminal-Adoption Trap.
- **The graph synthesizes artifacts deployed in another system, but the synthesizer's mechanism (parser/runtime/AST surface) differs from the deployment's.** Wrong. See `pitfalls.md` § Mechanism Mismatch.
- **`describeRepo` output reads like jargon to someone who hasn't seen this project.** The graph isn't ready for adoption. See `design-rules.md` § Description Rule.
- **A shape carries more than ~25 fields, or any shape carries > 100K instances.** Run the entity-discovery audit before adoption. Almost every wide shape has swallowed a hidden entity (the same district name stored 9M times across precinct neighbors is a `Precinct`), carries twin-encoded fields (`_desc`/`_abbrv` carrying the same info in two encodings), or has sparse sub-entity fields (rural-only districts empty for 95% of instances) that the four-direction test won't catch. See `field-level-design.md`.
- **A `_desc`/`_abbrv` twin pair, or any two fields where one's value determines the other's** (`country_code` + `country_name`, `id` + `id_string`). Twin-encoded fields — derive one at read time, or it's a lookup entity. See `field-level-design.md` § Tell 2.
- **A field whose value will be wrong at a different calendar time** (`age_at_year_end`, `days_since_signup`, `current_quarter`, `is_active` as a 30-day window). Stored derivations on immutable things are dated bombs. See `field-level-design.md` § Tell 5.
- **An ingested string field that downstream consumers will match or group on, stored source-verbatim with no canonical sibling** (`"2518 WAKE DR "` with double-space and trailing whitespace). Canonicalization gets re-solved by every reader instead of once at ingest. See `field-level-design.md` § Tell 6.
- **A shape declares many fields filterable on a multi-million-instance shape, but you only ever navigate by a few.** The wide filter surface is a promise the runtime can't keep and a sign the shape is over-wide. Slim it by finding the hidden entities (tells 1–4 in `field-level-design.md`) rather than trying to back every field with an index. See `field-level-design.md` § Tell 8.
- **Multiple independent sources write BDU opinions about the same binary propositions and the repo is hand-rolling fusion or trust weighting.** That's a component job. Use [../veritas-design/SKILL.md](../veritas-design/SKILL.md) to decide whether Veritas should own reputation-weighted consensus.

## What this skill is not

It is not a flowchart that picks shapes for you. The dimensions are diagnostic, not prescriptive; the catalog gives starter vocabulary, not recipes; the entries are real on-ramps with real tradeoffs, not equivalent options to flip a coin between. The skill's job is to make the *space of choices* legible so a designer makes the right call with eyes open, and to surface the convergence destination clearly enough that whichever path got them there, they can verify they're done.

It is also not a prescription that every graph needs every shape from the catalog. A small honest graph with three shapes that exactly fit the domain beats a large graph that imports every textbook pattern.

## Next steps

After the design or review is complete, choose the next concrete move:

- **Adopt** — if the convergence checkpoint passes and the graph is ready for use.
- **Revise** — if a gate fails, update the shapes, names, `about` targets, or derivation policy and rerun the checkpoint.
- **Plan ingestion** — if the design is approved and needs source loading or automation work.
- **Audit live data** — if the graph is populated and read-side friction still needs localization.
