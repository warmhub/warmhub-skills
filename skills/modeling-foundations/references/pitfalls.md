# Pitfalls: Failure Modes Keyed To Dimension Mismatches

Most WarmHub-repo design failures are a single dimension misanswered, propagating through the shapes until the graph is wrong in a way that's expensive to retrofit. The fix is almost always to revisit the dimension, not to add more shapes.

This file is keyed by dimension, not by symptom. If you know which dimension is suspect, jump to that section. If you only see a symptom, the symptom-to-dimension index at the bottom maps it back.

---

## D1: Source Ownership

### Pitfall: Owning Bytes That Should Be Proxied

**Symptom.** The graph stores full PDF text, full ticket bodies, full transcripts as canonical fields. Storage grows fast; re-ingesting from the source produces conflicts; the graph becomes a bad fork of the source system.

**Why it happens.** Convenience. The proxy + external-fetch pattern feels indirect; storing the bytes feels self-contained. But the graph is no longer the *graph* — it is the source system's shadow copy.

**Fix.** Replace owned bytes with stable identity (DOI, commit SHA, ticket id, S3 key). Make the proxy a graph node. Make every assertion target the proxy, not the bytes. If the source bytes are truly needed for offline reproducibility, store a content-hash field on the proxy and let an external blob store hold the bytes.

### Pitfall: Identity-by-Position Instead of Identity-by-Stable-Key

**Symptom.** Things are named `Ticket/2024-Q3-batch-3-row-47` or `Claim/sprint-12-item-6`. Re-ingestion changes the names; references rot.

**Fix.** Use the source system's stable identity in the name (`Ticket/zendesk-118392`, `Claim/arxiv-2401.03192-claim-3`). Position is not identity.

---

## D2: Object Origination

### Pitfall: Treating Graph-Synthesized Objects Like Pre-Existing Ones

**Symptom.** The graph synthesizes candidate rules / themes / hypotheses but stores them with the same shape used for ingested ones. No materialization trace, no synthesis policy, no cost ledger.

**Why it matters.** Months later, you can't answer: *which prompt produced this?* / *did the synthesizer have access to the answer?* / *what did re-running cost last quarter?* The synthesized objects look durable but their provenance is missing.

**Fix.** For graph-synthesized objects, add: `MaterializationContextPolicy` (content-addressed, capturing what the synthesizer saw), `MaterializationTrace` (the run), `MaterializationStep` (per-iteration cost + model + outcome). Bind the trace to the synthesized object via wref.

### Pitfall: Materialization Leakage Without Policy Shape

**Symptom.** The synthesizer's "catches the bug" verdict is suspiciously good. Investigation reveals the materializer was given access to the fix PR or to test files written after the fix.

**Fix.** Make materialization policy a content-addressed shape. Bind every verdict to a policy wref. Verdicts under different policies are not comparable. Old verdicts under a discredited policy can be retracted en masse by walking the policy.

---

## D3: Derivation Cost

### Pitfall: No Content-Addressing on Expensive Derivations

**Symptom.** A re-run of the same synthesis produces a different verdict. There's no way to tell whether the difference is genuine signal drift or a non-determinism artifact, because the inputs that produced each verdict aren't hashed.

**Fix.** For expensive derivations, hash everything that could affect the result: input-packet hash, policy hash, model id, prompt-pack version, evaluator-mechanism hash. Store on the verdict. A re-run with identical hashes that produces a different result is a real finding (model drift, infra change). A re-run with different hashes is a different experiment — don't compare verdicts across them without flagging.

### Pitfall: Cost Hidden Across Many Shapes

**Symptom.** Nobody can answer "what did Q3's rule synthesis cost?" because cost data lives in five different shapes and isn't summable.

**Fix.** Add a `cost { tokens, dollars, runtimeSeconds }` sub-shape on every expensive-derivation result and on every materialization step. The sub-shape's hierarchy lets `Q5.1`-style portfolio cost queries roll up cleanly.

---

## D4: Mechanism Coupling

### Pitfall: Mechanism Mismatch — Synthesizer ≠ Deployment

**Symptom.** The graph's evaluator uses one parser/runtime/AST surface (e.g. ESLint with TypeScript ESTree). The deployment uses a different one (e.g. biome + standalone TypeScript-AST scripts). The graph's "caught" verdict and the deployment's "rule fired" signal measure different populations of code.

**Why it matters.** When the graph adopts a candidate based on backtest catch-rate and the deployment then measures forward trip-rate, the two metrics are not on the same axis. The falsifiability ledger conflates them. False confidence ensues.

**Fix.** Audit the deployment's mechanism *before* building the synthesizer's evaluator:
1. Read the target's `package.json`, `scripts/check-*`, pre-commit hooks, CI config. Find every place a check of the proposed remedy class would currently run.
2. If the target uses biome + standalone TS-AST scripts, build the evaluator to materialize TS-AST scripts. If ESLint, materialize ESLint rules. If multiple, pick the one the deployed remedy will use and document why.
3. The materialized artifact from a successful backtest *is* the deployment artifact. Treating evaluator and deployment as the same artifact is the design principle, not a coincidence.

If you can't make the synthesizer's mechanism match, do not adopt verdicts from that synthesizer. Document the gap, build a matching evaluator, re-run.

### Pitfall: Deployment Coupling Without Rollback Criteria

**Symptom.** Adopted artifacts are deployed; nothing in the graph captures *under what conditions we'd un-deploy them*. Over time, dead-but-deployed artifacts accumulate.

**Fix.** `ProcessChangeDecision` (or your domain's equivalent adoption shape) should include `rollbackCriteria` and `effectiveFrom` as required fields. Adoption without rollback criteria is irreversible by accident.

---

## D5: Evaluation Unit

### Pitfall: Per-Object Pipeline on a Cluster-Unit Problem

**Symptom.** Synthesis is run case-by-case. Each case costs $1–3 and 2–5 minutes; per-case verdict variance is high; after 50 cases the cost is $100+ and the recurring patterns aren't visible because each case is its own silo.

**Why it matters.** When the goal is preventative rules (lint, AST, CI gate, type constraint), the right unit is the *cluster* — a group of related defects/instances. Static-evaluator scoring of candidate rules against a cluster is microseconds per rule and tens of thousands of rules per dollar. Per-case materialize-and-execute is the *existence-proof anchor* (one rule, validated once at the introducing SHA), not the primary evaluation surface.

**Fix.** Add a clustering shape (`Topic/<id>` or equivalent) that gathers related cases. Add a static-evaluator pipeline that scores candidate rules against the cluster (catch_rate × (1 − fp_rate)). Reserve materialize-and-execute for the winners.

### Pitfall: Cluster-Unit Pipeline When Single-Object Forensics Are Needed

**Symptom.** The graph clusters defects into themes and synthesizes themes-level remedies, but a forensic question — "tell me what we know about *this specific* defect" — has nowhere to land. Per-case attribution / fix / oracle / classification are absent or shallow.

**Fix.** Layer the units. Single-object forensics (`§1` queries: introduction, fix, oracle, classification) sits alongside cluster-level synthesis (`§2` queries) and portfolio-level health (`§4–§5`). The same shape system supports all three when you don't collapse one layer into another.

---

## D6: Continuous External Evidence

### Pitfall: Terminal-Adoption Trap

**Symptom.** Adopted assertions accumulate. None of them have a shape recording continued real-world evidence. Six months later, nobody can tell which adopted things are still serving their goal and which have silently degraded.

**Why it matters.** When the world keeps producing evidence about adopted assertions but the graph has no shape to capture it, "adoption" becomes a one-way switch. Falsification becomes manual and rare. Degraded assertions stay adopted. Trust in the graph erodes.

**Fix.** Add a `LaterValidationSignal`-style shape with:
- A typed sub-type enum (forward trip, post-adoption catch, control drift, FP-observed, override-rate-regression, cost-regression, neutral).
- Adjudication slots (true-positive / false-positive / dismissed / pending) so signal volume doesn't drown signal quality.
- Stop-loss criteria on the adoption shape itself, so the graph can flag candidates for revise / rollback when thresholds cross.

Adoption gates extend: not just "did this not damage editorial surface?" but "is the falsifiability stream wired up and producing data?"

### Pitfall: Forward-Replay Infrastructure for a Terminal Domain

**Symptom.** A literature-review or proposal-ratification graph builds elaborate `LaterValidationSignal` infrastructure that never fires, because the world doesn't actually produce continuous evidence about ratified claims.

**Fix.** Re-check D6. If the answer is genuinely "terminal" or "bounded continuous," delete the forward-replay shapes and replace with a simpler scheduled-review shape (annual / quarterly).

---

## D7: Reviewer Composition

### Pitfall: ReviewEvent for Multi-Actor Adversarial Review

**Symptom.** The graph uses single-author `ReviewEvent` (one event, one reviewer, one target — the claim) for a domain where multiple agents critique each other's hypotheses, results, and decisions in parallel. Reviews get serialized into one log; the multi-target structure (Critique can target Hypothesis *or* Result *or* Decision) gets flattened.

**Fix.** Adopt a multi-target `Critique` shape. Critique is an authored assertion targeting any node, by any actor, with no implicit ordering. `ReviewEvent` and `Critique` can coexist — the former for human single-author claim review, the latter for adversarial cross-actor critique.

### Pitfall: Critique as a Field Instead of a Shape

**Symptom.** Critique is stored as a `critiqueText` field on the target shape. Multiple critiques get concatenated; authorship is implicit; per-critique BDU and retraction are impossible.

**Fix.** Critique is a first-class shape. The target uses a wref to the critique, not the other way around — and the same critique can target Hypothesis-or-Result-or-Decision via a polymorphic `target` wref.

---

## D8: Hypothesis Structure

### Pitfall: Flattening Competing Hypotheses Into One Point Estimate

**Symptom.** A defect could plausibly have been introduced by PR #2266 or PR #2392. The graph picks the highest-confidence candidate and stores `introducedBy: PR/2266` as a flat field. The alternative is mentioned in a comment, then forgotten.

**Why it matters.** When new evidence arrives that contradicts the chosen attribution, there's no shape to update — the alternative was already discarded. Per-method retraction is impossible. The graph quietly converges to overconfidence.

**Fix.** `MetaIntroductionHypothesis { memberHypotheses[], competingHypotheses[] }` with per-method `AttributionHypothesis` carrying its own BDU and evidence trail. Promotion of a winner does not delete the alternatives; it's reflected in relative certainty.

### Pitfall: BDU Where a Confidence Score Was Enough

**Symptom.** A simple-D8 graph (literature curation, ops state) imports subjective-logic BDU triples on every assertion. The team can't agree on what "uncertainty 0.18" means; downstream consumers ignore the BDU and use belief alone.

**Fix.** For point-estimate domains, use a single `confidence: number` field. Reserve BDU for domains where independent evidence sources merge across hypotheses and uncertainty composition is load-bearing.

---

## Cross-Cutting Pitfalls

### Pitfall: Stale Verdicts After Deriver Changes

**Symptom.** The verdict-deriver semantics or evaluator mechanism changes (e.g. ESLint evaluator retired, ts-ast-script evaluator introduced). Old verdicts under the old mechanism coexist with new ones in the append-only graph. Queries can't tell which mechanism produced which verdict.

**Fix.** Bind every verdict to a content-addressed mechanism + policy. When the mechanism changes, retract affected verdicts before re-deriving — don't let stale and fresh coexist without a flag. Retraction is append-only; it doesn't delete the old verdict, just marks it superseded.

### Pitfall: Context-Free Reader Mismatch

**Symptom.** The graph "works" — local scripts produce the expected outputs. But a context-free MCP / agent reading the same graph reports it as missing source grounding, missing review history, missing classification. Investigation reveals: the local scripts know how to traverse `Pair.second` to the source proxy, and the context-free reader doesn't.

**Fix.** Mirror key reader-facing fields onto assertions. For a basis assertion: `claimWref`, `sourceWref`, `sourceKind`, `sourceIdentityKey` directly on the assertion, in addition to the native `Pair` traversal. Description fields explicitly classify each field as identity / evidence / interpretation / convenience.

### Pitfall: Shape Without a Question

**Symptom.** A shape exists. Nobody can articulate which question it answers. It accumulates fields over time; six months later, removing it is a refactoring nightmare because two queries in different scripts depend on it for orthogonal reasons.

**Fix.** Maintain a question catalog (`atlas_queries.md`-style) where every shape "earns its place" by serving a Q. Adding a shape requires citing the Q(s) it unlocks. Retiring a shape requires citing the Qs that go dark. New queries can be added; un-served shapes are candidates for retirement.

### Pitfall: Anti-Queries Not Documented

**Symptom.** Every quarter, someone proposes adding "who personally introduced this defect?" or "which reviewer should have caught this?" The proposal gets relitigated. Eventually a partial implementation lands, then gets ripped out.

**Fix.** Maintain an anti-query section in the question catalog: queries the graph explicitly declines to optimize for, with reasons. This converts "shouldn't we ask X?" from a recurring derail into a one-line response.

### Pitfall: About-Target Arity Mismatch

**Symptom.** An assertion shape represents a relationship between two or more things, but `about` points at exactly one of the things, with the other endpoint(s) encoded as flat string fields in the assertion's data. Queries from the `about`-side endpoint see the assertion; queries from the other side don't. The relationship is one-sided in the graph.

**The canonical case.** A `DuplicateAssertion` has `about: subjectWref` (one ticket) and `originalWref: string` (the other ticket, as a flat field). Three failures result:

- Asymmetric: A is duplicate of B is a different graph node than B is duplicate of A, even though duplication is symmetric.
- One-sided traversal: `wh thing about TicketProxy/<A>` returns the DuplicateAssertion; `wh thing about TicketProxy/<B>` does not.
- `originalWref: string` doesn't participate in `wh thing refs`, doesn't enforce identity validation, isn't version-pinned.

**The canonical fix.** A `Resolution` uses a named Pair collection referenced via `about: "Pair/<name>"` (created by a prior `kind: "collection"` op). Both endpoints are queryable via `wh thing about <wref> --resolve-collections`. The single design choice yields four bidirectional queries for free.

**Why it matters operationally.** `about` is **immutable**. The recovery path for a wrong arity is to retract the bad assertions and re-assert with the correct arity. The retracted assertions remain in version history but are hidden from default queries. This is workable when caught early; expensive when discovered after large data load. The four-direction test in `primitives.md` exists to catch this *before* data lands.

**Diagnostic.** For each assertion shape, walk the four-direction test:
1. Subject side. `wh thing about <subject>` returns the assertion?
2. Object side. `wh thing about <other-endpoint> --resolve-collections` returns the assertion?
3. Aggregation. `wh assertion list --shape <Foo>` finds all of this kind?
4. Derived rollups. Multi-hop questions resolve as graph walks?

If any fails because of a flat string field where a wref edge should be, you have arity mismatch.

**Fix.** Choose the right collection type per `primitives.md`. In every case, create a named `kind: "collection"` op first, then point the assertion's `about` at the resulting wref — `about` accepts a wref only, never an inline collection object:
- **Pair** for directional 2-way (A → B differs from B → A): named `pair` collection op, then `about: "Pair/<name>"`.
- **Set** for symmetric or n-way: named `set` collection op, then `about: "Set/<name>"`.
- **List** for ordered with possible duplicates: named `list` collection op, then `about: "List/<name>"`.

For a genuine three-way relation, don't reach for a removed `triple` type — recommend a named domain shape or assertion that models the ternary relation directly; for mechanical grouping of three or more things where no directional or ordering semantics are load-bearing, use `set` or `list` instead.

Then add the mirrored convenience fields (`<subject>Wref`, `<object>Wref`, `<kind>`, `<identityKey>`) for context-free reader legibility — see `design-rules.md` § Context-Free Legibility.

**Operational note.** Querying through collection-targeted assertions requires the `--resolve-collections` flag on `wh thing about` etc. Document this in shape descriptions and tooling expectations; otherwise queries that should hit collection-targeted assertions will silently return empty.

**Migrating an existing populated graph.** If the v1 anti-pattern has already landed and there's data under it, the fix isn't trivially derivable from the `about`-immutability rule alone — it cascades, because every dependent assertion (CertaintyOpinion, ReviewEvent, Critique) targeting the v1 assertion has its own immutable `about` too. Each dependent must be retracted and rewritten alongside the v1 assertion. Four moves apply per v1 instance migrated: deterministic v2 names from canonical-sorted member wrefs (for idempotency), `migratedFrom` audit-trail field on every v2 assertion and rewritten dependent, per-row atomicity in a single `wh commit submit --ops`, and full retraction cascade (`wh assertion list --about <v1-wref>` to enumerate dependents). See [`migrations.md`](../../build-warmhub-repo/references/migrations.md) for the worked example, the script skeleton, and the idempotency-verification protocol.

### Pitfall: Vocabulary Leakage

**Symptom.** The graph's shape names suggest a different fingerprint than the graph's actual fingerprint. Context-free readers (and human reviewers skimming `describeRepo`) infer the wrong design intent from the names.

**Three cases observed in audits.**

- **A synthesize-and-test atlas with a learning layer.** Names like `NightShiftRun`, `RunFinding`, `Preference` read as ops-state-tracking. A reviewer skimming the names would expect a simpler ops-monitor design and miss that the graph is a factory + learning graph.
- **A multi-persona deliberative-synthesis graph.** Names like `Seat`, `Decision`, `Critique` read as governance/parliamentary. The data flow is scientific-research, not voting.
- **A system-metrics graph.** `Measurement` reads like a flat tabular column. It's actually the time-series spine of the whole system.

**Why it happens.** The rule "translate the catalog's shape names into your domain's nouns" is necessary but not sufficient. Domain-natural names can accidentally match a different fingerprint's vocabulary. The translation is right; the inferred fingerprint from the names alone is wrong.

**Fix.** After choosing names, do an explicit vocabulary-leakage check:

1. Read your shape names alone — no descriptions, no project context.
2. Ask: "What fingerprint would a reader infer from these names?"
3. If the answer differs from your actual fingerprint, rename until they match.

This is cheap at design time and expensive after data loads (every reference to the shape names — in scripts, in documentation, in MCP tool descriptions, in stakeholder mental models — has to be updated).

**Heuristic.** Names with strong fingerprint-specific connotations:

- `Seat`, `Vote`, `Ratification`, `Proposal` → governance.
- `Run`, `Event`, `Snapshot`, `Health` → ops-state-tracking.
- `Claim`, `Reviewed*`, `Basis` → literature curation.
- `Hypothesis`, `Backtest`, `Decision` → synthesize-and-test.
- `Theme`, `Cluster`, `Recommendation` → pattern-mining.

If you're using one set's vocabulary for a domain that's actually in another set, leakage is likely.

---

## Symptom-to-Dimension Index

| Symptom | Likely dimension | Section |
|---|---|---|
| Storage growing fast; re-ingestion conflicts | D1 | Owning bytes that should be proxied |
| Names rot when source re-ingests | D1 | Identity-by-position |
| Synthesized verdict surprisingly good | D2 | Materialization leakage |
| Re-run produces different verdict, can't tell why | D3 | No content-addressing |
| Can't answer "what did Q3 cost?" | D3 | Cost hidden across shapes |
| Backtest "catches" don't match production trips | D4 | Mechanism mismatch |
| Adopted artifacts can't be un-adopted | D4 | No rollback criteria |
| $100+ spent for a few cases' insight | D5 | Per-object on a cluster problem |
| "Tell me about this case" has no good answer | D5 | Cluster-only pipeline |
| Adopted things silently degrade | D6 | Terminal-adoption trap |
| Multiple agents' critiques get serialized | D7 | ReviewEvent for adversarial review |
| Alternatives "forgotten" once a winner picked | D8 | Flattening competing hypotheses |
| Relationship invisible from one endpoint's queries | Primitives | About-target arity mismatch |
| Shape names suggest a different fingerprint than the actual design | Cross-cutting | Vocabulary leakage |
| Local scripts work; external reader fails | Cross-cutting | Context-free reader mismatch |
| Shape exists but nobody owns it | Cross-cutting | Shape without a question |
| Same proposal relitigated every quarter | Cross-cutting | Anti-queries not documented |

If a symptom doesn't appear here, the failure mode may be domain-specific. Walk back through `dimensions.md` and check which dimension answer is most likely wrong.
