# Entry E — Post-Hoc-Audit-First Design

> **Best when.** The shape design is already in production with real data. Surface friction is showing up — read-side queries feel awkward, downstream consumers complain about traversal cost, `describeRepo` reads like jargon. You need to localize where the friction lives before deciding what to fix.
>
> **Real risk.** Treating the audit as a debugging tool rather than as design discipline. Once the audit passes, you still need to act on the friction — a clean audit only tells you the friction is *not* in the shape design, not that there's no friction.

---

## The principle

When friction surfaces on a populated graph, the five checkpoint gates ([checkpoint.md](../references/checkpoint.md)) work equally well as a **fault-localizer**. The graph is already in flight; you can't redesign it freely without paying retract-and-replay cost (see [migrations.md](../../build-warmhub-repo/references/migrations.md)). What you *can* do cheaply is run the checkpoint as an audit and use the result to decide where the problem actually lives:

- **Clean audit** → the friction is downstream of the shape design. Likely culprits: CLI ergonomics, the index, the glob/query engine, context-free-legibility gaps, missing tooling. Shape changes won't help; instrument and improve the read-path.
- **Dirty audit** → the friction is upstream. The shape design has a real defect (wrong `about` arity, missing question-coverage, debt-shapes, mechanism mismatch, terminal-adoption trap). Shape work is justified; plan a retract-and-replay migration.

This is the *same* checkpoint as entries A/B/C/D, used in a different mode. Initial-design entries run the checkpoint as a gate before adoption; entry E runs it on a populated graph to diagnose where friction comes from.

## When this entry fits

Use entry E when **all** of the following hold:

- The graph already has real data; ripping it up has nontrivial retract-and-replay cost.
- Read-side friction is concrete and reproducible (specific queries that should be easy but aren't; specific traversals that feel like text-search-with-extra-steps).
- You want to know whether to invest in shape changes or in tooling/index/CLI work, before committing to either.

If the graph is empty or pre-data, use entries A/B/C/D instead — they're cheaper than running the audit retroactively.

## Workflow

### 1. Capture the friction concretely

Write down 3–10 friction incidents in specific form: the query you were trying to express, what surprised you, what you ended up doing instead. Vague "it feels slow" doesn't localize anything; "to answer Q I had to enumerate shape X then post-filter on field Y because no traversal got me there" does.

### 2. Run the five checkpoint gates against the populated graph

Open [checkpoint.md](../references/checkpoint.md) and answer all five questions, but treat them as *audits* of what exists, not gates before adoption:

1. **Every shape cites a question it serves.** Walk every shape. Does it earn its place? Shapes added "in case" that never got cited are candidates for retirement.
2. **Four-direction test passes for every assertion shape.** This is the most diagnostic gate. Walk each relationship-bearing assertion and check: subject side, object side, aggregation, derived rollup. A flat-string endpoint where a wref array should be (the classic duplicate-assertion failure pattern) is upstream friction.
3. **Things/assertions/collections used correctly per canonical primitives.** Static lookup data as assertions; BDU on continuous-relevance edges; wrong `about` arity. Most of these are upstream — but expensive to fix once data exists.
4. **Universal foundations applied.** Description coverage, hierarchical names, append-only revision, context-free legibility, stale-verdict retraction. Description gaps and context-free-legibility gaps are usually fixable without shape churn.
5. **Pitfalls walked for the matched fingerprint.** Run [dimensions.md](../../modeling-foundations/references/dimensions.md), match a fingerprint in [pattern-catalog.md](../references/pattern-catalog.md), and check [pitfalls.md](../../modeling-foundations/references/pitfalls.md). Pitfalls that fire here often explain friction that felt mysterious.

### 2a. Run the field-level audit on any wide or instance-heavy shape

The five checkpoint gates catch **relationship defects** (the wrong endpoints reachable from the wrong sides, wrong `about` arity, missing review provenance). They do **not** catch **width defects** — a shape that passes the four-direction test cleanly can still be carrying 66 fields, 28 of which are duplicated across every instance in the same cluster, with 12 sparse domain-rule-empty, two derived fields that rot with calendar time, and a queryable surface the index plan can't honor.

This is the lens a voter-roll audit revealed: `Voter` passed the arity gate (single-thing identity, no relationship endpoints in question), but failed catastrophically on width — ~256M redundant string copies, `age_at_year_end` going stale every January 1, unparsed addresses defeating every donor match.

Run the field-level audit ([`field-level-design.md`](../../modeling-foundations/references/field-level-design.md)) on every shape that carries more than ~25 fields, and on every shape regardless of width when instance count crosses ~100K. The eight entity-discovery tells give you a deterministic walk:

1. **T1 thing width** — fields justified against the question catalog?
2. **T2 functional dependencies** — twin-pair fields encoding the same fact?
3. **T3 shared clusters** — fields taking the same values across things that share a natural attribute?
4. **T4 sparse fields** — fields empty for >95% of instances by domain rule?
5. **T5 derived/time-relative rot** — fields whose correctness depends on calendar time?
6. **T6 unparsed source strings** — matching-critical strings shipped without canonicalization?
7. **T7 Y/N flags as strings** — one-bit information stored as one-character strings at scale?
8. **T8 index economics** — declared queryable surface honorable by the actual index plan?

A clean field-level audit means the friction isn't in shape width — keep looking at the arity/relationship/foundation gates. A dirty field-level audit means the friction is in storage redundancy, derived-field rot, or index-plan dishonesty — shape work is justified, plan the slim-and-extract migration per [`migrations.md`](../../build-warmhub-repo/references/migrations.md).

### 3. Localize the friction

Match each friction incident from step 1 against the audit results from steps 2 and 2a:

- The audit was **clean** for the gate the friction would touch → the friction is downstream of the shape design. Investigate the CLI surface, the query engine, the index, missing tooling, or context-free-legibility gaps.
- The audit **failed** at a gate that the friction would touch → the friction is upstream. The shape design has a real defect; plan the fix.
- The audit failed at gates the friction does *not* touch → fix those defects independently (the audit isn't free; you should act on what it found), but they aren't what's causing the surface friction you started with.

### 4. Decide and act

- **Upstream fix:** plan a retract-and-replay migration per [migrations.md](../../build-warmhub-repo/references/migrations.md). Cascade through dependent assertions whose own `about` is also immutable.
- **Downstream fix:** instrument the read-path. File issues against tooling. Add mirrored fields for context-free legibility if that's what's missing.
- **Both:** the audit found defects you'll fix at the shape layer *and* the surface friction has a downstream root cause. Sequence them — usually downstream first (cheaper, faster feedback), upstream second (with the read-path improvements already in place to validate the fix).

## What this entry buys you

- **The audit is a cheap fault-localizer.** You don't have to guess whether the shape design is the problem; running the gates tells you.
- **Reuses existing discipline.** The four gates are already the checkpoint every initial-design entry converges on; entry E just uses them in audit mode instead of gate mode.
- **Prevents premature redesign.** If the shape design is clean, you don't pay retract-and-replay cost for a problem that lives in the CLI.
- **Prevents downstream patching of an upstream defect.** If the shape design is dirty, you don't accumulate tooling workarounds that disguise the real problem.

## What this entry costs you

- **Doesn't help if you skip the act-on-the-result step.** A clean audit is a diagnosis, not a fix.
- **Audit results can be ambiguous.** Some friction is partially upstream and partially downstream; you'll need judgment about where the cheapest fix lives.
- **Pitfalls are fingerprint-specific.** You still need to run the dimensions diagnostic; entry E doesn't skip that step.

## When to switch entries mid-stream

If the audit reveals that the shape design's fingerprint is genuinely wrong for the domain (you matched fingerprint X but the load-bearing assertions look like fingerprint Y), switch to **entry C (pattern-match)** and design a migration plan from scratch. The audit told you what's wrong; entry C tells you what to migrate toward.

If the audit reveals that the question catalog was never written — shapes proliferated without questions earning their existence — return to **entry A (query-first)** as a post-hoc audit. Write the catalog now, retire shapes that earn no question, keep the ones that do.

---

## Next

This entry's workflow converges on the same [checkpoint.md](../references/checkpoint.md) every initial-design entry does, but in a different posture: you're auditing a populated graph rather than gating an unpopulated design. After step 4 ("Decide and act"), the next move depends on what the audit found — migrate, instrument, or both.
