# Query-Catalog Template

This is the template used by **entry A (query-first)**. It also functions as the post-hoc audit format for entries B/C/D (write the catalog *after* the manifest, then check that every shape appears on at least one "Earns pressure for" line).

The template is distilled from two exemplars:

- **A literature-review wiki query north-star.** A research vault whose underlying WarmHub graph curates claims drawn from external papers and Git artifacts. The catalog was deliberately written *before any shape existed*.
- **A defect-prevention atlas query catalog.** A graph that ingests filed bugs and synthesizes prevention rules. The catalog has dozens of queries; every shape, evaluator, and signal cites the Q IDs it serves.

Both follow the same structure.

---

## File header

Every catalog opens with three things:

```markdown
# <Project> Query North Star

Companion to: <link to vision/why doc>, <link to phased-plan/how doc>.

This document is the *what*. Concrete shapes follow from this catalog, not before.

## Contract

Every shape, importer, fixture, and write-back step cites the query IDs it
unlocks. A proposed shape that serves no query in this catalog is suspect.
A query that stays important but blocked creates pressure for a new shape,
source signal, or ingestion stage.
```

The contract paragraph is load-bearing. It establishes the discipline: shapes earn their existence; un-served shapes are deferred.

## Status legend

Define a small status set up front:

```markdown
## Status legend

- `[R]` runnable against existing shapes and data.
- `[M]` blocked on data ingestion or fixture work; no new shape required.
- `[F]` blocked on a missing shape or assertion family that does not yet exist.
```

Status drives prioritization later — `[F]` queries are the pressure that earns new shapes; `[M]` queries are the pressure that earns ingestion / fixture work; `[R]` queries are existence proofs that the existing graph design works. For `[F]` relationship queries, record the future primitive contract in the query note (`about Set<TicketProxy>`, `typed wref array to Facility`, etc.). Do not leave the future shape as "Pair or field TBD."

## Section organization

Group queries by **audience**, not by shape. Common audience clusters:

- **Forensics** — "I'm looking at X. Tell me what we know." Single-object deep dives.
- **Class intelligence** — "What patterns recur across cases?" Cross-instance aggregations.
- **Lifecycle** — "What's this thing's status / timeline?" Single-object event walk.
- **Forward propagation** — "Something new happened. What does the graph have to say?" Reactive queries.
- **Methodology meta** — "Is the system working?" Graph self-diagnostics.
- **Anti-queries** — "Questions we explicitly decline to optimize for." Reasons listed.

Sections are numbered (§1, §2, …); query IDs are stable across the document's life (`Q§.N`).

## Query format

Every query follows this format:

```markdown
### Q§.N — <question in plain language>

Status: `[R]` | `[M]` | `[F]`

Traversal sketch:

    wh thing about <X> --shape <Y>
      -> <field/edge>
      -> <next traversal step>

Earns pressure for: <Shape1>, <Shape2>, <field on existing shape>

<Optional: 1–2 sentences on what this query unlocks that text search can't do.
What's the marginal value over a flat ledger?>
```

### Notes on each part

- **Question.** Plain language. The audience is a designer or stakeholder, not an MCP. "Which claims have weak certainty and high centrality?" beats "Filter ReviewedClaim by CertaintyOpinion.belief < 0.3 join refs count > N."
- **Status.** Updates over time. A query goes from `[F]` to `[M]` when the missing shape lands, then to `[R]` when fixture/data lands.
- **Traversal sketch.** Use `wh` MCP/CLI vocabulary (`thing about`, `thing refs`, `thing query`, `thing graph`). The sketch shows the shape of the answer, not the implementation. Multi-step traversals are an arrow chain.
- **Earns pressure for.** The most important line. Every shape, field, or assertion family this query justifies. If the line is empty, the query is already answerable — note that explicitly.
- **Optional commentary.** What does this query unlock that text search or a flat dashboard couldn't do? If the answer is "nothing," the query may not earn its place.

## Anti-queries section

Mandatory. List queries the graph **explicitly declines to optimize for**, with reasons:

```markdown
## §N — Anti-queries (explicitly out of scope)

| Anti-query | Reason |
|---|---|
| Who personally introduced this defect? | Process gaps, not person-blame. |
| Which reviewer should have caught this? | Same. |
| Is the prompt change the best remedy? | Anti-prompt-accretion: no, unless alternatives generated and backtested. |
```

Anti-queries convert "shouldn't we ask about X?" from a recurring derail into a one-line pointer.

## Provisional shape pressure section

After the queries, summarize the shapes the catalog earns pressure for. This is *not* the shape catalog — it's the pressure map the catalog produces:

```markdown
## Provisional Shape Pressure

This is not the shape catalog. It is the pressure map the shape catalog
should answer.

Likely early families:

- `ExternalSourceReference` — earns pressure from Q1.1, Q1.2, Q1.4.
- `ReviewedClaim` — earns pressure from Q2.1, Q2.2, Q2.3, Q2.4.
- `CertaintyOpinion` — earns pressure from Q2.1, Q2.3, Q2.5.
- ... etc.
```

The pressure map keeps the eventual shape design accountable to the catalog rather than to taste.

## What "correct modeling gives for free"

Optionally, before the queries themselves, list the capabilities a correctly modeled graph should provide for free — backrefs, forward chains, reverse impact analysis, certainty-aware traversal, replication hygiene, etc. These are **traversals**, not stored fields, and they're the tangible payoff of getting the modeling right.

The literature-review-wiki exemplar (above) opens with this section under "What Correct Modeling Gives For Free." It's a useful framing because it makes traversability the visible deliverable rather than a back-end concern.

## Maintenance rhythm

Treat the catalog as editable but disciplined:

- **Reviewed at every gate transition or whenever a new shape is proposed.** A new shape proposal cites which queries it serves; if it doesn't, the proposal is premature.
- **Each query SHOULD have an executable form.** A small runner (the WarmHub Defect Atlas, for instance, has an `atlas-queries.ts --coverage` script) reports `[R]` / `[M]` / `[F]` status per query against the live graph. The catalog doubles as a verification harness: "can the graph answer Q3.4 right now?" is a runnable test, not a hope.
- **Sunset queries deliberately.** Removing a query is a scope decision; cite the shapes that no longer have to exist if the query is sunset.

## Worked example: literature-review wiki north-star excerpt

```markdown
### Q1.2 — Given an arXiv ID, DOI, URL, or Git file revision, what uses it?

Status: `[R]`

Traversal sketch:

    thing refs ExternalSourceReference/arxiv/2602.00307v1
    thing refs GitFileRevision/<commit>/<path>
      -> ReviewedClaim, WikiArtifactRevision, SummaryProxy, SynthesisProxy

Earns pressure for: first-class source proxy things and uniform reference fields.

This is the simplest payoff: source-centric backrefs without full-text search.
```

## Worked example: defect-prevention atlas excerpt

```markdown
### Q1.7 — What remedies have been proposed for X?

```
wh thing about FiledDefectIssue/X --shape PreventionOpportunity
  → for each opportunity:
      wh thing about <opportunity> --shape DetectionRemedyHypothesis
```

Earns: `DetectionRemedyHypothesis`. The opportunity is the bridge — multiple
remedies per opportunity, multiple opportunities per case, no single shortcut
field would preserve the structure.
```

## Bootstrapping a catalog: first hour, first day, first week

- **First hour.** List 5–10 audience questions per audience cluster. Don't worry about completeness. Don't assign IDs yet.
- **First day.** Format each question per the template above. Add status. Add traversal sketches even if rough. Add anti-queries section.
- **First week.** Add `Earns pressure for` lines. Walk the catalog with a stakeholder (or yourself, in a different mood). Mark queries as `[F]` where shapes are missing; that's the shape catalog's first todo list.

The catalog is never finished. New questions arrive as the domain matures; old questions sunset as their underlying need disappears. Both are fine — the discipline is in the contract (every shape earns a question; every question is honest about its status), not in the contents.
