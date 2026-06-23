# Dimensions: 9 Questions That Classify Your Domain's Pressure

These are diagnostic questions, not a flowchart. Together your answers form a *fingerprint* that indexes into a model family in `pattern-catalog.md`. Two domains with the same fingerprint usually want similar shapes; domains that disagree on even one dimension often need different shapes for that aspect.

This file is a **classifier**, not a starting point. Whichever entry path you took (A query-first, B entities-first, C pattern-match, D sources-first), you arrive here to identify what *kind* of pressure your domain creates and which catalog entries match. Read all 9 before consulting the catalog. "Doesn't apply here" is itself an informative answer — it tells you which patterns *not* to import.

Three dimensions (D5, D7, D8) carry an explicit sub-axis because audits revealed two separate questions hiding inside what looked like one dimension. Answer both sub-questions; they're independent.

---

## D1. Source Ownership — Does the graph own the source-of-truth, or proxy to it?

- **External proxy.** The underlying material lives in another system (papers in arXiv, code in Git, tickets in Zendesk, transcripts in S3). The graph asserts *about* those things via stable identity (DOI, commit SHA, ticket id). Your graph is never authoritative for the bytes.
- **Graph-internal.** The thing being asserted about is born inside this graph (a proposal, a hypothesis the graph itself synthesized, a decision an actor in this graph made). Identity is graph-assigned.
- **Mixed.** Some assertion-targets are external (the input data) and some are graph-internal (artifacts the graph generates from that data — e.g. candidate rules, derived theories).

**Why it matters.** External-proxy domains live or die on stable identity keys. Graph-internal domains need to invest in identity assignment + collision resistance. Mixed domains need both.

## D2. Object Origination — Are assertion-targets pre-existing or graph-synthesized?

- **Pre-existing.** Someone or something else made the target object before the graph saw it. The graph's job is to interpret, classify, evaluate, or relate.
- **Graph-synthesized.** The graph itself produces the target object — by an LLM, a search, a multi-agent panel (sometimes called a "council"), a generator. The synthesis cost matters; the synthesis policy matters; reproducibility of the synthesis is a graph concern.
- **Both, in different layers.** A defect-prevention atlas ingests pre-existing bug reports (D2-pre) and synthesizes candidate prevention rules (D2-syn). The two layers want different shapes.

**Why it matters.** Synthesized objects need provenance shapes that pre-existing objects don't (materialization traces, synthesis policy, cost ledger, leakage audit). Skipping this for graph-synthesized targets means later you can't tell whether a "good" verdict came from genuine signal or from a circular synthesis.

## D3. Derivation Cost — Is producing a downstream assertion cheap or expensive?

- **Cheap and deterministic.** Parse, dedupe, count, deterministic transforms. Re-running produces the same answer; no need to content-address inputs because regeneration is free.
- **Expensive and nondeterministic.** LLM calls, simulations, tournaments, councils. Re-running may produce different answers; cost grows with corpus size; verdicts are individual events worth preserving.
- **Mixed.** Some assertions are cheap, some are expensive.

**Why it matters.** Expensive derivations need three things cheap derivations don't: (a) content-addressed input hashes so a verdict can be re-audited later, (b) trace/step shapes recording what happened during derivation, (c) cost shapes so portfolio ROI is queryable. Skipping these in expensive-derivation graphs means you can't tell six months later whether an old verdict is still trustworthy.

## D4. Mechanism Coupling — Does the graph synthesize artifacts deployed elsewhere?

- **Declarative only.** The graph's outputs are recommendations, classifications, opinions, dashboards, documents. Nothing the graph produces gets executed in another system.
- **Deployed artifacts.** The graph synthesizes runnable things (lint rules, schema migrations, IaC plans, behavior trees, prompts) that get installed in a target system and execute there.
- **Hybrid.** Some outputs deploy, some don't.

**Why it matters.** When the graph ships executable artifacts elsewhere, the graph's *evaluator* of candidate artifacts must run them under the same parser/runtime/AST surface as the deployment. Otherwise the graph's "this remedy catches the bug" verdict and the deployment's "this rule fired in production" signal measure two different populations, and the falsifiability ledger silently conflates them. (See `pitfalls.md` § Mechanism Mismatch.)

## D5. Evaluation Unit — Two sub-questions

### D5.1: Primary unit

- **Single object.** A single claim, a single deployment, a single proposal. Scoring is per-object.
- **Cluster of related objects.** A group of related defects, a recurring theme, a family of regressions. The cluster is what gets a remedy.
- **Portfolio.** Aggregate quality of a whole adopted set (every active lint rule, every shipped feature, every active policy). Scoring is fleet-level.
- **Trajectory.** A metric trajectory or evidence-accumulating sequence is itself the unit. Each iteration's verdict is downstream of the trajectory's history (Anchor refit chain, MAD-confidence, hill-climb selection policies). Distinct from "single repeated N times" because the agent's next move depends on the entire history, not just the last result.

### D5.2: Layering

- **Single-layer.** Only one of the above is load-bearing; queries operate at one scoring level.
- **Multi-layer.** Several layers coexist (per-case forensics + cluster synthesis + portfolio health, or per-iteration verdict + trajectory rollup). Each layer needs its own shapes; the interfaces between layers are themselves design decisions.

**Why it matters.** Cluster-unit problems on a per-object pipeline waste 10–100× the budget for the same insight. Per-object problems on a cluster pipeline lose forensic grain. Trajectory-unit problems forced into single-object thinking lose history-aware selection logic. Multi-layer designs that don't articulate the layer interfaces produce graphs whose layers drift apart over time.

## D6. Continuous External Evidence — Does adoption produce a steady stream of post-hoc evidence?

- **Terminal adoption.** Once a claim is "reviewed and accepted," nothing in the world keeps producing evidence about it. The graph's last word is the last word until a human re-opens it.
- **Continuous evidence.** After adoption, the world *keeps producing data* about whether the adopted thing is still right (every merged PR, every ticket, every transaction is a fresh draw). The graph needs a shape for those signals plus an adjudication slot.
- **Bounded continuous.** Periodic external evidence on a slower cadence (quarterly NPS, annual audit, monthly compliance check).

**Why it matters.** Continuous-evidence domains where the graph treats adoption as terminal end up with unfalsifiable adopted assertions. Terminal-evidence domains that build forward-replay infrastructure waste the engineering. The fingerprint determines whether `LaterValidationSignal`-style shapes are load-bearing or premature.

## D7. Reviewer Composition — Two sub-questions

### D7.1: Composition

- **Human only.** Domain experts read claims and emit review events. Critique is informal or external to the graph.
- **Agent only.** Pipelines and bots produce all assertions; humans audit aggregates, not individual reviews.
- **Mixed cooperative.** Humans and agents both contribute, generally aligned on judgment.
- **Adversarial mixed.** Multiple agents (and sometimes humans) generate, critique, and counter-critique each other's assertions. Critique is itself a load-bearing shape; the same node can be critiqued by N actors with no implicit ordering.

### D7.2: Persistence

- **Ephemeral role label.** Reviewer is a string field on a review event, no graph identity.
- **Single-session attributed.** Reviewer is a wref-typed actor, queryable within its session, but doesn't accumulate across sessions.
- **Durable typed Thing with track record.** Reviewer is a first-class graph Thing (e.g. `Persona/<id>`, `Actor/<harness>-<model>`), with cross-session attribution, scorecards, and effectiveness metrics. Membership in a council is its own assertion (e.g. `Seat/<council>/<persona>`).

**Why it matters.** Single-author review fits a `ReviewEvent` shape (one event, one reviewer, one target). Multi-actor adversarial review needs `Critique` as an authored, multi-target assertion. Persistent persona models need a separate Persona/Seat/scorecard layer that ephemeral roles don't. Conflating the three flattens the audit trail.

## D8. Hypothesis Structure — Two sub-questions

### D8.1: Alternatives preservation

- **Single.** One winning explanation; alternatives, if mentioned, are prose comments or are silently dropped when a winner is picked.
- **Multiple kept as first-class.** Competing alternatives are durable assertions with their own evidence and retraction history. Promotion of a winner is reflected in relative certainty, not in deletion.

### D8.2: Uncertainty placement

> **BDU** = belief / disbelief / uncertainty — a subjective-logic opinion triple, optionally with a base-rate prior `α`. WarmHub's canonical way of carrying per-assertion uncertainty. See [`primitives.md` § BDU](primitives.md) for the full definition and the binomial-opinion constraint.

- **None.** No formal uncertainty model. Lifecycle states or qualitative confidence labels suffice.
- **Confidence score.** A single `confidence: number` on the assertion. Point estimate, simple to interpret.
- **BDU on assertion truth.** Subjective-logic `(b, d, u, α)` triples on the assertion itself, modeling how strongly the assertion's truth is believed. Subject to the binomial-opinion constraint: the underlying claim must be a binary proposition.
- **BDU on relationship edges.** Triples on the edge between two things, modeling edge-strength or relevance. Non-canonical for continuous-relevance concepts (the binomial-opinion constraint applies; relevance isn't strictly binary), but observed in practice when uncertainty composition across edges is wanted.
- **BDU on both.** Per-assertion truth opinion *and* per-edge relevance opinion coexist.
- **BDU consolidated by Veritas.** Multiple independent sources write `Certainty` opinions about the same binary propositions, and the Veritas component computes reputation-weighted `Consensus`. Use [../../veritas-design/SKILL.md](../../veritas-design/SKILL.md) for source identity, reputation, oracle, and consensus design.
- **Distributional.** The hypothesis is itself a parameter distribution (e.g. posterior over a model parameter). Domain-specific.

**Why it matters.** Domains with one obvious answer flatten fine into single + confidence. Domains where attribution, causation, or classification are routinely contested need multiple + BDU on assertion truth. Domains where the strength of *connection* between things is the load-bearing concept (e.g. a knowledge-accumulation graph carrying Lesson↔Topic relevance opinions, or an external-proxy analysis graph carrying duplicate-of strength between issues) put BDU on edges. Forcing all uncertainty into the same placement loses signal; choosing the wrong placement is hard to retrofit.

## D9. Stack Position — Where does this graph sit in the consumption hierarchy?

- **Foundation library / shared component.** The graph (as a WarmHub component) is consumed by other repos. Its shape contracts must remain stable for downstream consumers; evolution is additive-only; install-path-independence matters because consumers won't all live in the same directory.
- **Middleware.** The graph extends a foundation and is consumed by leaf applications. It carries the foundation's stability constraints downstream and adds its own conventions. Shape changes require coordination with both upstream and downstream.
- **Leaf application.** The graph is the end of the line. No one consumes its shapes as a contract. It can evolve freely; rename shapes when needed; treat its WarmHub component as internal infrastructure.

**Why it matters.** Foundation libraries face design constraints (additive-only evolution, shape stability across versions, install-path independence, version negotiation, no breaking renames) that are entirely invisible to D1–D8. Leaf applications can evolve freely. Treating a foundation library like a leaf application produces breaking changes that ripple through every consumer; treating a leaf application like a foundation library produces over-engineered version negotiation no one uses. This dimension surfaced independently when auditing a reusable research-arc foundation component against an earlier 8-dimension version of this skill — the existing dimensions had no axis for "are your shapes themselves a contract that other repos depend on?"

---

## How to use the fingerprint

Write your answers as a tuple. Examples:

- `(D1: external proxy | D2: pre-existing | D3: cheap | D4: declarative | D5.1: single, D5.2: single-layer | D6: terminal | D7.1: human-mixed, D7.2: single-session-attributed | D8.1: single, D8.2: confidence | D9: leaf)` → literature-review pattern.
- `(D1: mixed | D2: both | D3: expensive | D4: deployed | D5.1: cluster, D5.2: multi-layer | D6: continuous | D7.1: adversarial-mixed, D7.2: durable-typed | D8.1: multiple, D8.2: BDU-on-assertion | D9: leaf)` → synthesize-and-test atlas pattern.
- `(D1: external proxy | D2: pre-existing | D3: cheap | D4: declarative | D5.1: single, D5.2: multi-layer | D6: continuous | D7.1: agent-only, D7.2: ephemeral | D8.1: single, D8.2: BDU-on-edges | D9: leaf)` → external-proxy analysis graph pattern.
- `(D1: graph-internal | D2: graph-synthesized | D3: mixed | D4: declarative | D5.1: single, D5.2: single-layer | D6: bounded continuous | D7.1: mixed-cooperative, D7.2: single-session | D8.1: single, D8.2: confidence | D9: foundation library)` → research-arc foundation pattern.

Then go to `pattern-catalog.md` and find the closest match. If no entry matches your fingerprint, that's worth pausing on. Either your domain is genuinely novel (rare) or one of your dimension answers is wrong (more likely — re-check D2, D4, D6, and D9, which are the most-often-misanswered).

If two entries are close, you're likely a hybrid. See `pattern-catalog.md` § Layered Co-Fingerprints.

## When sub-axis answers conflict with the matched fingerprint

A fingerprint match in the catalog is approximate. If your sub-axis answer (D5.2 multi-layer when the matched entry shows single-layer; D7.2 durable-typed when the entry shows ephemeral) differs, the difference is informative — it usually means you need to *extend* the matched fingerprint with shapes the entry doesn't list, not adopt a different fingerprint. Note the divergence; consult the relevant catalog entry's "where it fails when transplanted" notes.
