# Pattern Catalog: Successful Model Families

Each entry is a *family*, not a recipe. The shape names are illustrative; translate them into your domain's nouns. The dimension fingerprint is the diagnostic match (see `dimensions.md`). The "characteristic queries," "why this works," and "where it fails when transplanted" notes are the load-bearing parts — they explain *why* the shapes look the way they do, so a designer can adapt them when their domain partly matches.

The catalog deliberately includes diverse domains. The point is not to imitate any one entry; it is to see the *space of valid choices* and which dimensions move you between them. Thirteen entries are listed; the majority were drawn from real WarmHub repos audited during the skill's development, the rest are illustrative families designers will recognize from common knowledge-graph use cases.

| # | Family | Canonical exemplar (with one-line gloss) |
|---|---|---|
| 1 | Literature-review graph | A research wiki backed by a WarmHub graph that curates claims drawn from external papers + Git artifacts. |
| 2 | Synthesize-and-test atlas | A graph that ingests filed bugs and synthesizes candidate prevention rules, then validates them against historical SHAs — a defect-prevention atlas. |
| 3 | Governance / proposal-ratification | (Illustrative — no audited exemplar; described from common patterns.) |
| 4 | Operational state-tracking | (Illustrative — services / deployments / flags / incidents with continuous telemetry.) |
| 5 | Pattern-mining atlas | (Illustrative — customer-feedback theme discovery, e.g. ticket clustering with quarterly NPS as outcome signal.) |
| 6 | Research-arc foundation | A reusable WarmHub component shipping a small typed vocabulary for hypothesis-to-decision research arcs, consumed by other repos. |
| 7 | Iterative metric optimization | A portable skill package wrapping an agent's optimization loop: commit a hypothesis before each benchmark run, record the arc after. |
| 8 | Measurement-series atlas | A benchmarking repo capturing benchmark run outputs as versioned `Measurement` assertions, with explicit comparability metadata. |
| 9 | Multi-persona deliberative synthesis | A multi-agent panel ("council") of distinct personas generating, critiquing, and synthesizing hypotheses with cross-session scorecards. |
| 10 | Knowledge-accumulation graph | A graph that captures atomic agent-session lessons connected to topics by typed-edge assertions, designed for retrieval (a skill writing session lessons into a learnings repo). |
| 11 | External-proxy analysis graph | A graph that proxies external entities (issues, vents, transcripts) and adds analytical relationship assertions about them, with confidence (e.g. an issue-deduplication graph or an agent-friction vent graph). |
| 12 | Cross-repo substrate-split | A two-repo split where a stable identity substrate (low volume, high reuse) is a foundation library and a high-volume consumer references it via cross-repo wrefs (e.g. a stable facilities-identity foundation repo + a high-volume analytical consumer repo). |
| 13 | Reputation-weighted consensus (Veritas-backed) | A graph where multiple independent sources write BDU opinions about stable binary propositions, and Veritas computes trust-discounted Consensus. |

The exemplar names are concrete pointers to real WarmHub repos visible to the skill's author at design time; they're useful when you want to read the actual manifest and see how the abstract pattern plays out in code. None of them is required for understanding the family — the **fingerprint** and the **load-bearing shapes** in each entry are the load-bearing content.

If your fingerprint doesn't match any cleanly, see § Layered Co-Fingerprints at the end — a single repo can match multiple fingerprints at different layers.

---

## 1. Literature-Review Graph

**Fingerprint.** `D1: external proxy | D2: pre-existing | D3: cheap | D4: declarative | D5.1: single, D5.2: single-layer | D6: terminal | D7.1: human-mixed, D7.2: single-session | D8.1: single, D8.2: confidence-or-BDU-on-assertion | D9: leaf`

**Domain.** A team curates claims drawn from a corpus of papers, wikis, or other authoritative source documents. Goal: a graph that captures what was said, who supported it, what evidence backs it, and which claims need more review.

**Characteristic queries that earn the shapes.**

- "What is the stable identity of wiki artifact X?" → earns source-proxy shapes.
- "Given an arXiv ID or commit SHA, what uses it?" → earns first-class proxies and uniform reference fields (backref discipline).
- "Given claim C, what is its full basis chain?" → earns ReviewedClaim, ClaimBasis, CertaintyOpinion, source spans.
- "Which central claims have weak certainty?" → earns centrality aggregation against belief state.
- "Which claims lack independent replication?" → earns ReplicationAssertion with source-independence semantics.

**Load-bearing shapes.**
- `ExternalSourceReference` — proxy for a paper/document, identified by arXiv/DOI/URL.
- `GitFileRevision` — proxy for a wiki file at a specific commit + path.
- `ReviewedClaim` — a manually reviewed, scoped claim about a subject artifact.
- `ClaimBasis` — assertion linking a claim to a source proxy. A named collection op creates the Pair first; the assertion targets it via `about: "Pair/<name>"`. Mirrored fields: `claimWref`, `sourceWref`, `sourceKind`, `sourceIdentityKey`.
- `CertaintyOpinion` — belief / disbelief / uncertainty about a claim (binary proposition).
- `ReviewEvent` — single-author event recording why certainty, basis, or scope changed.

**Why this works.** External-source-of-truth + pre-existing targets means stable identity is cheap (DOIs and SHAs are given). Cheap derivation means no need for content-addressed input hashes. Single-object scoring with terminal adoption means a reviewed-and-stable claim is a reviewed-and-stable claim. Human-mixed review fits single-author `ReviewEvent` cleanly.

**Where it fails when transplanted.** Used as-is for a synthesize-and-test domain, it loses (a) competing-hypothesis structure, (b) materialization provenance, (c) continuous post-adoption evidence. The result is a graph that *looks* tidy but cannot answer "is the adopted thing still working?" or "did the synthesizer cheat?"

---

## 2. Synthesize-and-Test Atlas (Defect-Atlas-shaped)

**Fingerprint.** `D1: mixed (external Git proxies + graph-synthesized candidates) | D2: both | D3: expensive ($1–3 per case) | D4: deployed as runtime artifacts | D5.1: cluster, D5.2: multi-layer | D6: continuous | D7.1: adversarial-mixed, D7.2: durable-typed | D8.1: multiple, D8.2: BDU-on-assertion | D9: leaf`

**Domain.** A graph ingests filed defects, synthesizes candidate prevention rules, validates them empirically against historical data, and decides which to deploy. Post-deployment, every merged PR and every new defect is fresh falsification fuel.

**Characteristic queries that earn the shapes.**

- "Given a defect, where did it come from?" → earns MetaIntroductionHypothesis with competing AttributionHypothesis members carrying BDU.
- "What's the ground truth for this case?" → earns CaseOracle.
- "What remedies have been proposed for class X?" → earns Topic-as-spine + DetectionRemedyHypothesis.
- "Did this remedy keep firing on real merged PRs after we adopted it?" → earns LaterValidationSignal with adjudication.
- "What materialization context did this verdict run under?" → earns content-addressed MaterializationContextPolicy + Trace + Step.
- "Cost-per-adopt-decision trend" → earns cost sub-shape on every expensive derivation.

**Load-bearing shapes.**
- `FiledDefectIssue` / `CaughtDefectCase` — externally-addressed defect identities.
- `Topic/<defectClassId>` — class spine for cross-case traversal.
- `MetaIntroductionHypothesis` + `AttributionHypothesis` — competing hypotheses for "where did the defect come from," each with its own BDU, evidence trail, and per-method retraction.
- `PreventionOpportunity` — bridge from a case to candidate remedies.
- `DetectionRemedyHypothesis` — the synthesized candidate.
- `BacktestPlan` / `BacktestResult` — verdict shapes for runs against historical SHAs.
- `MaterializationContextPolicy` — *content-addressed* shape recording what the synthesizer saw (oracle files, fix-PR awareness, future-test exposure). Bound to every `BacktestResult` via wref so "caught" verdicts can be re-audited for circularity.
- `MaterializationTrace` / `MaterializationStep` — per-iteration cost + convergence telemetry.
- `Critique` — multi-target authored assertion. Can target Hypothesis, Result, *or* Decision; any actor can author one; multiple coexist.
- `ProcessChangeDecision` — adopt / reject / defer, with rationale + rollback criteria + tracking issue.
- `LaterValidationSignal` — continuous post-adoption evidence (forward-replay trip, class-recurrence catch / escape, control drift, FP-observed) with adjudication slots.

**Why this works.** Mixed source ownership requires both external-proxy patterns *and* graph-internal identity for synthesized artifacts. Expensive derivation justifies content-addressed policy shapes and trace/step shapes. Deployment coupling forces the synthesizer to use the deployment's mechanism (see `pitfalls.md` § Mechanism Mismatch). Continuous evidence is what makes adoption falsifiable. Cluster as evaluation unit makes preventative-rule synthesis tractable; per-case backtests are reserved as existence-proof anchors.

**Where it fails when transplanted.** Used as-is for a literature-review domain, it ships eight shapes that sit empty (no synthesis, no deployment, no continuous evidence) and burns description budget on irrelevant fields.

---

## 3. Governance / Proposal-Ratification Graph

**Fingerprint.** `D1: graph-internal | D2: human-authored | D3: cheap | D4: deployed as policy | D5.1: single, D5.2: multi-layer (single proposal + portfolio) | D6: bounded continuous (compliance audits) | D7.1: human voting + audit-bot, D7.2: durable-typed (Voter as identity) | D8.1: multiple (alternatives preserved), D8.2: confidence | D9: leaf`

**Domain.** A team proposes, debates, and ratifies organizational policies. Each proposal goes through versions, comments, votes, and a ratification event. Ratified policies become artifacts (a docs page, a config file, a ruleset) that are subject to compliance signals over time.

**Characteristic queries.**

- "What proposals are open in scope X, and what alternatives have been considered?" → earns Proposal + ProposalVersion + Alternative.
- "Who voted how on proposal P?" → earns Vote with Voter wref.
- "Is policy P still in compliance?" → earns ComplianceSignal with adjudication.
- "Which ratifications have been overridden or rolled back?" → earns Ratification with rollback-criteria field.

**Load-bearing shapes.**
- `Proposal` — graph-internal identity; carries problem statement, scope, rationale.
- `ProposalVersion` — append-only revision; never overwrites prior versions.
- `Alternative` — a competing proposed approach within the same Proposal scope; preserved with `dismissalRationale` even when not chosen.
- `Vote` — `about: "Pair/<name>"` (named collection op first); carries position + commentary.
- `Ratification` — durable adoption event with effective-from + rollback criteria.
- `PolicyArtifact` — proxy for the deployed policy (URL, file path, config key) — the graph asserts about it but doesn't store its bytes.
- `ComplianceSignal` — bounded-cadence external evidence; adjudication slot for whether the policy is still serving its goal.

**Why this works.** Graph-internal identity means the graph is authoritative for "what proposals exist." Ratified artifacts are still external proxies because the graph doesn't own the wiki/config bytes. Bounded continuous evidence justifies `ComplianceSignal` without the volume of a synthesize-and-test atlas. Alternatives preserved at proposal-time matches D8.1=multiple without needing BDU — votes already carry the disagreement structure.

**Where it fails when transplanted.** Used for synthesize-and-test, it has no shape for materialization provenance, no per-iteration trace, no portfolio-level falsifiability ledger. Used for literature review, it imposes a vote/ratification ceremony that doesn't match how claims actually get accepted in a curation graph.

---

## 4. Operational State-Tracking Graph

**Fingerprint.** `D1: external (services, deployments, infra) | D2: pre-existing | D3: cheap (metric ingestion) | D4: declarative | D5.1: single + portfolio, D5.2: multi-layer | D6: continuous (telemetry) | D7.1: agent-only (ingest + alerting), D7.2: ephemeral | D8.1: single, D8.2: confidence | D9: leaf`

**Domain.** A graph models the live state of operational entities — services, deployments, feature flags, incidents — and continuously ingests telemetry. Goal: answer "what's deployed where," "what changed when this incident started," "which services are unhealthy."

**Characteristic queries.**

- "What's deployed to service X right now?" → earns DeploymentEvent + ServiceProxy with HEAD-state derivation.
- "What changed at the time this incident started?" → earns DeploymentEvent + FeatureFlagState as time-bound proxies.
- "Which services in cluster Y are degraded?" → earns continuous HealthSignal aggregation.
- "Which deployments are linked to which incidents?" → earns IncidentLink as a Pair-targeted assertion.

**Load-bearing shapes.**
- `ServiceProxy` — external identity (cluster + namespace + service name).
- `DeploymentEvent` — append-only event; commit + image + actor + timestamp.
- `FeatureFlagState` — append-only flag-change event; no current-value shape (current state is derived).
- `HealthSignal` — continuous external evidence (probe result, error-rate sample, latency snapshot).
- `IncidentLink` — `about: "Pair/<name>"` (named collection op first); connects an incident proxy to suspected services.

**Why this works.** Cheap deterministic ingestion means no content-addressed policy shapes. Continuous evidence is the entire point — without it the graph is just a stale config dump. Agent-only ephemeral review means no `ReviewEvent` ceremony around state changes. Simple D8 means flat shapes without competing-hypothesis machinery.

**Where it fails when transplanted.** Used for literature review, the absence of a review-event shape makes the graph unable to record human-judgment changes to a claim. Used for synthesize-and-test, there's no shape for "we synthesized and tested a candidate remedy" — the graph would have to invent it from scratch.

---

## 5. Pattern-Mining Atlas (Customer-Feedback / Theme-Discovery)

**Fingerprint.** `D1: external (tickets, transcripts, surveys) | D2: graph-synthesized themes from pre-existing inputs | D3: expensive (LLM clustering) | D4: declarative recommendations | D5.1: cluster, D5.2: multi-layer | D6: bounded continuous (quarterly NPS / monthly retro) | D7.1: PM humans + agent clustering, D7.2: single-session | D8.1: single (per theme), D8.2: BDU-on-assertion (theme coherence) | D9: leaf`

**Domain.** A graph ingests customer-feedback artifacts (tickets, support transcripts, survey responses), clusters them into themes, and recommends investments. Themes are graph-synthesized; the input artifacts are external proxies.

**Characteristic queries.**

- "What themes are dominating Q3 feedback?" → earns ThemeHypothesis + ClusterAssignment.
- "Which tickets contributed to theme T?" → earns ClusterAssignment with confidence.
- "Did the recommendation we made last quarter correlate with theme volume going down?" → earns ThemeOutcomeSignal as bounded-continuous evidence.
- "What did the clustering pass actually see?" → earns MaterializationContextPolicy.

**Load-bearing shapes.**
- `TicketProxy` / `TranscriptProxy` — external identities.
- `ThemeHypothesis` — graph-synthesized cluster identity, with BDU on "this is a coherent theme" (binary proposition).
- `ClusterAssignment` — `about: "Pair/<name>"` (named collection op first); carries assignment confidence.
- `MaterializationContextPolicy` — what the clustering pass saw (corpus window, embedding model, prompt version). Content-addressed.
- `ThemeReviewEvent` — human PM review that confirms/rejects/refines a theme.
- `InvestmentRecommendation` — proposed engineering investment derived from a cluster's volume + severity.
- `ThemeOutcomeSignal` — bounded continuous evidence: did the recommended investment correlate with theme volume going down?

**Why this works.** Like the defect-prevention atlas (fingerprint #2), this is a synthesize-and-test pattern with mixed object origination — but `D6: bounded continuous` rather than `D6: continuous` means the post-adoption evidence stream is sparser, so it doesn't justify forward-replay infrastructure; quarterly outcome signals are enough.

**Where it fails when transplanted.** Used for high-throughput synthesize-and-test (the defect-prevention atlas pattern), the bounded-evidence cadence is too slow. Used for governance, the ad-hoc human-review pattern lacks the formal vote/ratification structure governance audits require.

---

## 6. Research-Arc Foundation (Experiment-Graph-shaped)

**Fingerprint.** `D1: graph-internal | D2: graph-synthesized | D3: mixed | D4: declarative-only | D5.1: single, D5.2: multi-layer (Hypothesis chain + Outcome rollup) | D6: bounded continuous | D7.1: mixed cooperative, D7.2: single-session-attributed | D8.1: single, D8.2: confidence | D9: foundation library`

**Domain.** A reusable WarmHub component that gives any consuming repo a typed, traversable, auditable record of hypothesis-to-decision research arcs — without the multi-agent council ceremony or the deployment-coupling of leaf applications.

**Characteristic queries.**

- "What's the chain of reasoning behind decision D?" → earns Topic / Hypothesis / Experiment / Finding / Decision linkage.
- "Show me all measurements anchored to baseline X" → earns Anchor with refit chain.
- "What did this actor commit, across sessions?" → earns Actor as durable Thing.
- "Which hypotheses are open, and what's their evidence so far?" → earns Hypothesis lifecycle + Finding wrefs.

**Load-bearing shapes (10).**
- `Topic` — anchor for a research arc.
- `Hypothesis` — claim under test, with lifecycle.
- `Experiment` — designed test of a hypothesis.
- `Measurement` — observed value under an Experiment.
- `Finding` — interpreted result.
- `Decision` — adopt / reject / defer outcome.
- `Claim` — polymorphic interpretation (kind: contradiction / root-cause / supports / etc.).
- `Anchor` — baseline for refit chains; supports trajectory-aware updating.
- `Outcome` — multi-Hypothesis rollup at session end.
- `Actor` — author identity (ai-agent / human / script / service).

**Why this works.** Foundation-library status (D9) drives most of the design discipline: shapes are minimal and orthogonal so consumers can extend without breaking; install-path-independent skills assume no repo-root layout; additive-only evolution preserves backward compatibility for downstream repos. The shape set is a *vocabulary layer* for the arc concept; consuming repos (deliberative-synthesis councils, overnight build-and-learn loops, solo optimization loops) instantiate the arcs with their own contextual shapes.

**Where it fails when transplanted.** Used as a leaf application's primary shape design, it under-models everything specific to the leaf domain — no Persona shapes for adversarial review, no deployed-artifact shapes for synthesize-and-test, no continuous-evidence ledger. Foundation libraries are *substrate*, not finished applications.

**D9-specific design discipline.** Shape changes are additive; field renames are forbidden once the foundation has consumers; manifest version negotiation is required across major-version bumps; install ergonomics matter (skills work regardless of where the consumer's repo root sits).

---

## 7. Iterative Metric Optimization (Hill-Climb-Loop-shaped)

**Fingerprint.** `D1: graph-internal | D2: graph-synthesized | D3: expensive nondeterministic | D4: deployed (real code commits) | D5.1: trajectory, D5.2: multi-layer (per-iteration verdict + trajectory rollup) | D6: bounded continuous (loop horizon) | D7.1: agent-only with harness gate, D7.2: single-session | D8.1: single, D8.2: confidence (MAD-noise-floor ratio) | D9: leaf (or middleware over the research-arc foundation)`

**Domain.** A portable optimization loop where an agent commits a hypothesis before a benchmark run, records the full evidence arc after, and resumes from typed graph state rather than model memory. Each iteration changes real code; the metric trajectory across iterations is the unit of evaluation.

> **Anchor refit chain** = the trajectory pattern where each iteration's measurement either becomes a new baseline ("anchor") or feeds the existing one, so that future hypothesis selection reads the full metric history rather than just the last result.
>
> **MAD** = median absolute deviation, a robust statistical noise-floor estimator. **MAD confidence** here means "is the new measurement different from the anchor by more than the noise floor?" — a continuous signal-to-noise ratio, not a binary belief.

**Characteristic queries.**

- "What hypotheses has the agent tried, and which moved the metric?" → earns Hypothesis + Measurement + Anchor refit.
- "What's the current best baseline, and how confident are we it's better than the previous one?" → earns Anchor with MAD-confidence.
- "What did this iteration actually change, and did the gate pass?" → earns Decision with `landedCommit` + correctness-gate result.
- "Which paths did the agent explore and reject?" → earns Decision lifecycle states (keep / reject / defer).

**Load-bearing shapes.**
- Inherits the research-arc foundation vocabulary (Topic / Hypothesis / Experiment / Measurement / Finding / Decision / Anchor / Outcome / Actor / Claim — see fingerprint #6).
- Adds: per-iteration cost telemetry, MAD-confidence computation, history-aware "what next?" selection policy as a runtime concern (not necessarily a graph shape).

**Why this works.** Trajectory-as-unit (D5.1) is what distinguishes this from per-case backtest. The Anchor refit chain *is* the trajectory; each new Measurement updates the baseline; future hypothesis selection reads the entire history. MAD-normalized confidence (a noise-floor ratio, not BDU) suits a hill-climbing context where uncertainty is statistical noise on continuous metrics, not belief about binary propositions.

**Where it fails when transplanted.** Used as a defect-prevention atlas, the lack of an external bug corpus and absence of adversarial multi-persona review starve the design. The MAD confidence ratio is also wrong for binary defect-prevention verdicts; BDU on the attribution hypotheses is what's needed there (see fingerprint #2).

---

## 8. Measurement-Series Atlas (Benchmark-Capture-shaped)

**Fingerprint.** `D1: external (live system being benchmarked) | D2: pre-existing catalog of metrics + graph-synthesized measurements | D3: expensive nondeterministic (benchmark runs are 25–30 min, prod-state-dependent) | D4: declarative | D5.1: portfolio, D5.2: multi-layer | D6: continuous (post-release, on-demand, recurring) | D7.1: human-only with agent tooling, D7.2: ephemeral | D8.1: single, D8.2: none (raw percentile envelopes) | D9: leaf`

**Domain.** A graph that captures benchmark run results from a live system as versioned `Measurement` assertions, enabling trend analysis and regression investigation. Distinct from ops-state-tracking because the data is the result of *deliberate experimental runs*, not passive telemetry, and runs are expensive enough to require careful comparability tracking.

**Characteristic queries.**

- "What's the latency trend for system X on dataset Y over the last quarter?" → earns Measurement + Metric + Dataset + BenchmarkSystem shapes.
- "Are these two measurements actually comparable, or did the system or repo state change between them?" → earns the **commensurability contract** (gitSha, repoState, latencyProfile, dataset metadata as first-class graph fields, not opaque JSON).
- "Which metrics regressed across systems in this checkpoint?" → earns portfolio rollups across BenchmarkSystem.
- "What was the system state when this measurement was taken?" → earns metadata-as-fields, not metadata-as-blob.

**Load-bearing shapes.**
- `BenchmarkSystem` — pre-existing catalog of systems under test (convex / postgres-cli / postgres-direct / ...).
- `Dataset` — pre-existing catalog of workloads.
- `Metric` — pre-existing catalog of measured quantities (latency, throughput, glob).
- `Measurement` — graph-synthesized assertion; the `triple` type is removed, so the (System, Dataset, Metric) key is modeled as a named domain shape whose name encodes all three axes with a `+`-free slug (e.g. `MeasurementKey/<system>-<dataset>-<metric>`; `+` is rejected in thing and collection names alike), referenced via `about: "<Shape>/<name>"`, or as a named Set via `about: "Set/<name>"` if the axes are mechanical grouping rather than a genuine domain shape; carries percentile envelope + commensurability metadata as **first-class fields** (gitSha, repoState, latencyProfile, dataset variant).

**Why this works.** The hard problem in this domain is not "how do I store a number" but "how do I know two stored numbers are comparable." Pulling the comparability metadata out of an opaque `metadata` JSON blob and into first-class graph fields is what lets queries answer "which two of these can I trend together?" Without that, the graph is a numeric ledger; with it, the graph is a benchmarking analysis substrate.

**Where it fails when transplanted.** Used for ops-state-tracking, the expensive-deliberate-runs assumption doesn't fit passive telemetry (every probe result would have first-class commensurability fields it doesn't need). Used for synthesize-and-test, there's no shape for the candidate-remedy synthesis half.

---

## 9. Multi-Persona Deliberative Synthesis (Council-shaped)

**Fingerprint.** `D1: graph-internal | D2: graph-synthesized | D3: expensive | D4: hybrid (real experiments executed; not deployed-as-policy) | D5.1: cluster, D5.2: multi-layer (single Hypothesis evaluated + Session-Outcome rollup) | D6: bounded continuous | D7.1: adversarial-mixed, D7.2: durable-typed (Persona is a Thing) | D8.1: multiple (competing premises preserved), D8.2: confidence-with-structured-premises | D9: leaf (or middleware over the research-arc foundation)`

**Domain.** A multi-agent council runs structured deliberation per Topic. Distinct personas (compass / skeptic / grinder / sage / logician) generate, critique, and synthesize hypotheses. Persistent persona identities accumulate effectiveness scorecards across sessions.

**Characteristic queries.**

- "What did each persona contribute to session S?" → earns Persona-attributed Hypothesis + Critique.
- "Which personas have been most effective on Topic T historically?" → earns cross-session scorecards on Persona-as-Thing.
- "What discriminating evidence remains after this round of critique?" → earns Hypothesis with `discriminatesAgainst[]` edges + qa-coverage decomposition Claims.
- "Across this session, which Hypotheses converged?" → earns RoundDigest + Session + SessionOutcome.

**Load-bearing shapes.**
- Inherits the research-arc foundation.
- Adds: `Persona` (durable typed Thing — not a role label); `Seat` (`about: "Pair/<name>"`, named collection op first — council membership as first-class assertion); `Hypothesis.persona` wref; `Hypothesis.premises[]` wref array (MECE conditions); `Hypothesis.discriminatesAgainst[]`; `RoundDigest`, `SessionOutcome`; `Critique` as a multi-target authored assertion.

**Why this works.** Persona persistence (D7.2 = durable typed Thing) is the design's central commitment. A persona is not a tag on an output; it's an identity with track record, attribution edges, and cross-session scoring. Adversarial review (D7.1 = adversarial-mixed) requires `Critique` as a multi-target shape, not a single-author `ReviewEvent`. Competing hypotheses with structured premises (D8.1 = multiple, D8.2 = confidence-with-structured-premises) preserve discriminating evidence rather than collapsing to a winner.

**Where it fails when transplanted.** Used for solo-agent research, the Persona / Seat / multi-agent overhead is unjustified — the simpler research-arc foundation is the right fit. Used for governance, the persona model doesn't match formal voting roles.

---

## 10. Knowledge-Accumulation Graph (Capture-Learnings-shaped)

**Fingerprint.** `D1: graph-internal | D2: graph-synthesized | D3: cheap | D4: declarative | D5.1: single + topic-spine, D5.2: single-layer | D6: terminal-but-retrievable | D7.1: agent-mostly with manual approval gate, D7.2: ephemeral | D8.1: single (Lesson is a fact), D8.2: BDU-on-edges (Learning.relevance) | D9: leaf (consumer of warmhub-component conventions)`

**Domain.** Agents and humans capture session insights as structured Lessons connected to Topics via Learning assertions. The graph's value is *retrieval* — future agents searching for relevant prior knowledge before starting work.

**Characteristic queries.**

- "What lessons exist for topic T?" → earns Topic + Learning edges.
- "What lessons does an agent searching for `<phrase>` find?" → earns vector search over Lesson, with Learning-relevance as filter.
- "Which lessons are most relevant to this topic, and how confident are we?" → earns BDU on Learning edges.
- "Which topics has lesson L been tagged into?" → earns bidirectional traversal via Pair-targeted Learning.

**Load-bearing shapes (3).**
- `Topic` — named anchor; description-only thing.
- `Lesson` — atomic insight (title + context + insight + trigger); single canonical fact, not a multi-perspective claim.
- `Learning` — assertion connecting Topic to Lesson via Pair: `about: "Pair/<name>"` (named collection op first); carries `relevance: { b, d, u, a }` as edge-strength opinion.

**Why this works.** Cheap derivation + declarative output + topic-spine cluster pattern fits a knowledge-accumulation graph cleanly. The defining design choice is **D8.2 = BDU-on-edges**: the *Lesson* is a fact (no uncertainty about whether it's true); the *strength of association between a Lesson and a Topic* is what carries belief / disbelief / uncertainty. This places BDU in a structurally different location than the synthesize-and-test pattern.

**Caveat on the binomial-opinion constraint.** Strictly, BDU triples assume binary propositions. "How relevant is this lesson to that topic" is a continuous concept; using BDU on it stretches the canonical semantics. The pattern works in practice because the BDU is interpreted as a confidence band rather than a strict probability — but designers should be aware they're bending the rule, and consider whether a single `confidence` score suffices for their case.

**Where it fails when transplanted.** Used for literature curation, the absence of basis edges (which sources support this Lesson?) and review events makes the graph unable to track provenance. Used for synthesize-and-test, there's no place for synthesis context, no decision shape, no continuous evidence.

---

## 11. External-Proxy Analysis Graph (ticket-dedup / feedback-shaped)

**Fingerprint.** `D1: external proxy | D2: pre-existing | D3: cheap ingest + agent-synthesized analytical assertions | D4: declarative | D5.1: cluster (semantic clusters of tickets / feedback items), D5.2: multi-layer (per-record + cluster) | D6: continuous (live sync from source system) | D7.1: agent-only (analytical), D7.2: ephemeral | D8.1: single, D8.2: BDU-on-edges (relationship strength) | D9: leaf`

**Domain.** A graph that proxies external entities (tickets, feedback items, transcripts) and adds analytical assertions about *relationships between* them — duplicate-of, blocked-by, resolved-by, addressed-by. The proxies are pre-existing; the relationship analysis is graph-synthesized with confidence.

**Characteristic queries.**

- "What tickets are duplicates of this one?" → earns DuplicateAssertion as a Set-targeted assertion (symmetric).
- "What's blocking ticket X?" / "What does ticket X block?" → earns DependencyAssertion as a Pair-targeted assertion (directional).
- "What resolved this vent?" / "Which vents does this workaround resolve?" → earns Resolution as a Pair-targeted assertion.
- "Show me all vents addressed by any fix on FrictionTarget Z" → earns 3-hop traversal (FrictionTarget → Vent → Resolution → ResolutionTarget).
- "What's the cluster of tickets semantically related to X?" → earns derived-query traversal with semantic-search filter.

**Load-bearing shapes.**
- `<ExternalProxy>` (e.g. `TicketProxy`, `Vent`, `FrictionTarget`) — pre-existing entity identities.
- `<RelationshipAssertion>` (e.g. `DuplicateAssertion`, `DependencyAssertion`, `Resolution`) — graph-synthesized analytical assertions. **`about` is a Pair or Set of proxies (or a named domain shape for genuine ternary relations) — never a single proxy with the others as flat string fields.** This is the canonical case where the four-direction test in `primitives.md` is load-bearing.
- `CertaintyOpinion` — BDU on the *relationship-strength* (binary proposition: "is this really a duplicate? yes/no").
- `ReviewEvent` — single-author event when a human confirms or refutes a graph-synthesized relationship.

**Why this works.** External-proxy + relationship-analysis is the pattern that shows up across many "ingest from system X, analyze structurally" graphs. The defining design choice is **D8.2 = BDU-on-edges**: BDU lives on the relationship assertions because the strength of the *connection* is what's uncertain, not the truth of either endpoint. This is also the pattern where a friction-vent design (Resolution about a Pair) succeeds and a ticket-dedup v1 design (DuplicateAssertion about a single thing with the other endpoint as a flat field) fails — they target the same fingerprint but get the arity choice opposite.

**Where it fails when transplanted.** Used for literature curation, the absence of `about: source-proxy` claims (basis chain) and review-event ceremony loses the curation discipline. Used for synthesize-and-test, the lack of materialization context and continuous evidence post-adoption leaves verdicts unfalsifiable.

**D8.2 caveat (same as #10).** BDU triples on relationship strength stretch the binomial-opinion constraint when "strength" is a continuous concept. For pure binary propositions ("is this a duplicate? yes/no"), BDU-on-edges is canonical; for continuous strength, consider a single confidence score on the assertion instead.

---

## 12. Cross-Repo Substrate-Split

**Fingerprint.** `D1: mixed (substrate external proxies + consumer-side derived events) | D2: both | D3: mixed (cheap ingest in substrate, may be expensive in consumer) | D4: declarative | D5.1: single + portfolio (substrate identity + consumer-side events), D5.2: multi-layer (the two repos *are* the layers) | D6: continuous in consumer | D7.1: agent-mostly, D7.2: ephemeral or single-session | D8.1: single, D8.2: confidence | D9: split — substrate is foundation, consumer is leaf`

**Domain.** A graph has both (a) a stable identity substrate with low volume and high reuse — facility records, entity registries, master catalogs — and (b) high-volume event/derived shapes that reference the substrate — emissions records, transaction histories, derived analytics. Splitting them into two repos joined by cross-repo wrefs separates the foundation-library role from the leaf-application role cleanly.

**Characteristic queries.**

- "What facility is this emissions record about?" → earns the cross-repo wref from consumer to substrate; resolves transparently via `wh thing about`.
- "What references this facility, across all repos?" → earns same-repo + cross-repo inbound traversal via `wh thing refs --inbound`, which returns refs from both the substrate's own repo (Demographics, FrsProgramLink) and from any consumer repo (EmissionsRecord) in one call. This is the **only** reverse-traversal call that crosses the boundary: reverse `wh thing about` is repo-local and would return 0 from the substrate side. That asymmetry is exactly why the consumer→substrate link must be a typed wref field, not an `about`-Pair — see [`primitives.md` § The four-direction test across a repo boundary](../../modeling-foundations/references/primitives.md).
- "Did the substrate's identity for this entity change between version X and version Y?" → earns the substrate's append-only revision discipline (additive-only shape evolution) plus cross-repo wref version-pinning.
- "Population-weighted match of substrate attributes with consumer events" → earns sample-friendly deterministic naming on the substrate (e.g. `Demographics/<facilityId>/<radius>`) so the consumer can batch-fetch the relevant slice without enumerating the full substrate.

**Load-bearing shapes (split across two repos).**

In the **substrate repo** (foundation-library, D9 = foundation):
- `<EntityProxy>` (e.g. `Facility`) — external identity, often source-system-derived, with deterministic hierarchical names.
- `<EnrichmentAssertion>` (e.g. `Demographics`, `<Program>Link`) — substrate-internal enrichments that other consumers may also want.
- Strict foundation-library discipline: additive-only shape evolution, conservative naming, install-path-independent tooling.

In the **consumer repo** (leaf, D9 = leaf):
- `<EventOrDerivedShape>` (e.g. `EmissionsRecord`) — high-volume events whose `about` (or mirrored wref fields) point at substrate entities *via cross-repo wrefs*. Cross-repo wrefs auto-pin to the specific substrate version that existed at commit time.
- Consumer-side derivations, analytics, materialization-context policies — whatever the leaf domain needs that doesn't belong in the foundation.

The design discipline this pattern assumes — which side owns the wref, never publishing unresolved strings in wref-typed fields, the unresolved-target policy, and the target-retraction / identity-merge / stable-join-key prompts — is consolidated in [`cross-repo-linkage.md`](../../modeling-foundations/references/cross-repo-linkage.md).

**Why this works.** Cross-repo wrefs version-pin: a consumer-side query reads a frozen view of substrate state at commit time, so substrate revisions don't silently invalidate consumer queries. The split lets the substrate enforce foundation-library discipline (see `design-rules.md` § Foundation-Library Discipline) without being polluted by consumer-specific assertions; the consumer keeps its high-volume churn isolated. `wh thing refs --inbound` resolves across the boundary, so the substrate's entities remain discoverable from the consumer's data without the consumer needing to re-host the substrate's facts.

The pattern is structurally distinct from #6 Research-Arc Foundation: #6 ships a *vocabulary* (Hypothesis/Experiment/Decision/...) consumed by many leaves; #12 ships an *identity substrate* (specific entities + canonical enrichments) consumed by one or a few leaves. Both are foundation libraries; the foundation in #12 is closer to a domain-specific master catalog than to a reusable shape vocabulary.

**Where it fails when transplanted.** Use the substrate-split when both halves are real: a low-volume stable substrate *and* a high-volume churny consumer. If the consumer needs to revise substrate identity at high velocity (renaming entities, restructuring hierarchies), the substrate is not actually stable and the foundation-library discipline cracks — collapse to one repo and accept the churn. If consumers want to issue assertions *about* substrate identity (claims that the substrate's view of a facility is wrong), the substrate is no longer a foundation and a different pattern applies (probably #1 literature-review or #11 external-proxy analysis with the substrate's entities as the proxies).

---

## 13. Reputation-Weighted Consensus (Veritas-Backed)

**Fingerprint.** `D1: mixed | D2: both | D3: mixed | D4: declarative | D5.1: single or cluster, D5.2: multi-layer | D6: continuous or bounded continuous | D7.1: mixed or agent-only, D7.2: durable-typed | D8.1: single or multiple, D8.2: BDU consolidated by Veritas | D9: leaf or middleware`

**Domain.** A repo has multiple independent agents, humans, feeds, benchmarks, or pipeline stages
judging the same stable binary proposition assertions. The product needs a derived consensus that
discounts each source by learned reputation, not a hand-rolled average or one flattened confidence
score.

**Characteristic queries.**

- "What is the consensus belief/disbelief/uncertainty for proposition P?" -> earns Veritas `Consensus`.
- "Which sources supported or opposed proposition P, and how uncertain were they?" -> earns one `Certainty` per source per stable proposition assertion.
- "Which source identities are reliable for this proposition type?" -> earns durable source Things and reputation audit.
- "What ground truth trained these reputations?" -> earns `Oracle/*` sources that write `Certainty` on the same proposition assertions.
- "What evidence did source S use when it judged proposition P?" -> earns repo-owned prediction/review/adjudication records, not extra fields on component shapes.

**Load-bearing shapes.**

- Stable binary proposition assertion targets such as `PullRequestRegression/<pr-id>` or
  `MatchHomeWin/<match-id>`; their `about` points at the domain thing or relationship being judged,
  and their names encode proposition identity, not source, run, or probability.
- Veritas component shapes: `Certainty`, `Support`, `Opposition`, `Consensus`, and `Oracle`.
- Durable source Things such as `Agent/*`, `Pipeline/*`, `Human/*`, and `Oracle/*`.
- Repo-owned provenance records such as `PredictionRecord`, `ReviewRecord`, or `AdjudicationRecord` for evidence wrefs, model version, frozen source output, and rationale.

**Why this works.** Veritas only learns and fuses when multiple sources write opinions about the same
proposition assertion. Stable proposition identity lets opinions meet. Durable source identity lets
track records accumulate. Oracle `Certainty` on the same proposition assertion teaches reputation and
settles consensus. Repo-owned provenance shapes preserve audit detail without trying to extend
component-owned shapes.

**Where it fails when transplanted.** A single-source graph produces an echo: consensus equals the
source opinion. Snapshot-keyed proposition assertions fragment one proposition into many targets.
Setting `alpha` to the source prediction collapses expectation back to the prediction and hides
uncertainty. Re-adding instead of revising source opinions creates duplicate active `Certainty` from
the same source on one target. Recording outcomes somewhere other than on-target `Certainty`
prevents reputation learning.

**Deep guidance.** Use [../../veritas-design/SKILL.md](../../veritas-design/SKILL.md) for the Veritas fit decision, source identity, reputation seeding, Oracle topology, write loop, and display rules.

---

## Cross-Cutting Field-Design Patterns

Some patterns aren't model families — they're field-level design choices that apply across many fingerprints. They get full entries here because they're load-bearing for the graphs that need them, but they don't carry a 9-dimension fingerprint of their own.

### CC.1 — Verbatim Source Plus Semantic Derived Fields

**Fingerprint.** Cross-cutting: any shape with `D1: external proxy` whose ingest stage performs a semantic mapping (acronym → enum, code → label, raw status → canonical state). Independent of D3-D9.

**Domain.** A shape stores values that arrived from an external source in one form and must be interpreted into a canonical form for downstream queries. Examples: an EPA program affiliation arrives as the acronym `"RMP"` and is interpreted as the semantic enum `risk-management`; a service health probe arrives as a numeric code and is mapped to a status label; a free-text status field is mapped to a controlled vocabulary.

**Characteristic queries.**

- "Show me the source-verbatim value for this ingested field" → earns `<field>Raw` (or `<field>SourceValue`).
- "Show me the canonical / semantic value" → earns `<field>` (or `<field>Semantic`).
- "When did the mapping policy last change?" → earns the `mappingPolicyWref` field per [`design-rules.md` § Stale-Verdict Retraction Discipline](../../modeling-foundations/references/design-rules.md).
- "Which ingested instances would be reinterpreted under the new mapping policy?" → earns a query that matches on `mappingPolicyWref` and a `<field>Raw` value that now maps to a new semantic value.

**Load-bearing fields.**

- `<field>Raw` (or `<field>SourceValue`) — the source-verbatim value, never rewritten.
- `<field>` (or `<field>Semantic`) — the derived / mapped value; regenerable under a revised mapping policy without re-ingesting source bytes.
- `mappingPolicyWref` — content-addressed reference to the mapping policy / version under which the derived field was computed. (Optional but strongly recommended; see [`design-rules.md` § Stale-Verdict Retraction Discipline](../../modeling-foundations/references/design-rules.md).)

**Why this works.** Ingest decisions stay auditable: a reviewer compares `<field>Raw` against the mapping policy without re-ingesting. The derived field is regenerable under a new policy without destroying the source record. Downstream queries pick the surface they want: raw for exact-source lookups, semantic for canonical traversal. When the mapping changes, `mappingPolicyWref` makes the change a shape-level event that can be retracted and replayed, not silent drift.

**Worked example.** A shape ingesting environmental-program affiliations carries `programAcronymRaw: "RMP"` (source-verbatim) and `program: "risk-management"` (semantic enum). The mapping had known gaps (RMP, CEDRI, SEMS, TSCA — acronyms not yet in the map produced empty `program` fields). When the map later filled those gaps, regenerating `program` was a derivation pass over `programAcronymRaw`; the raw values were untouched and the `mappingPolicyWref` flagged which instances now had a new semantic interpretation.

**Where it fails when transplanted.** If the source value is already canonical (e.g., a stable UUID, a DOI, an arXiv ID), splitting raw vs. semantic just duplicates the same string — drop the pattern. If the mapping is irreversible or the raw value is ephemeral (a transient probe reading that's not reconstructible), the audit benefit disappears. The pattern earns its weight only when (a) the source value is interpretation-bearing and (b) the interpretation policy is liable to evolve.

---

## Anti-Patterns

These show up as catalog matches that *almost* work but fail in characteristic ways. Knowing the smell saves a redesign cycle.

### A1. Claim-Review Pattern Misapplied to Synthesize-and-Test

**Symptom.** The graph has `ReviewedClaim` + `ClaimBasis` + `CertaintyOpinion` + `ReviewEvent` for a domain that synthesizes candidate artifacts and tests them empirically. Attribution of a defect to a commit is modeled as a `ReviewedClaim` whose basis is a `GitFileRevision`.

**Failure modes.**
- Per-method evidence gets flattened into one certainty opinion. Per-method retraction becomes lossy.
- Competing attributions are silently dropped or split into independent `ReviewedClaim`s with no shape connecting them as alternatives.
- No place to bind a content-addressed materialization policy to the verdict; "caught" claims can't be audited for circularity.
- No shape for continuous post-adoption evidence; "adoption" has no falsifiability ledger.

**Fix.** Drop `ReviewedClaim`. Use `MetaIntroductionHypothesis { memberHypotheses[], competingHypotheses[] }` + per-method `AttributionHypothesis` with embedded BDU. Add `MaterializationContextPolicy` and `LaterValidationSignal` per the synthesize-and-test pattern.

### A2. Synthesize-and-Test Pattern Misapplied to Pure Literature Review

**Symptom.** A literature-curation graph imports `MaterializationContextPolicy`, `MaterializationTrace`, `LaterValidationSignal`, and a multi-target `Critique` shape. The graph has 18 shapes; only six are populated; `describeRepo` is a wall of text.

**Fix.** Delete unused shapes. Keep `ReviewedClaim` + `ClaimBasis` + `CertaintyOpinion` + `ReviewEvent` + source proxies.

### A3. Continuous-Evidence Domain With Terminal Adoption

**Symptom.** A domain where the world keeps producing post-adoption evidence is modeled with terminal-adoption shapes: a `Decision` event closes the loop and nothing observes it after.

**Fix.** Add a `LaterValidationSignal`-shaped continuous-evidence shape with explicit adjudication slots and stop-loss criteria. Adoption gates extend past "no editorial damage" to "ongoing falsifiability stream is wired up."

### A4. Mechanism Mismatch on Deployed-Artifact Synthesis

**Symptom.** The graph synthesizes a lint rule using ESLint. The target system uses biome only and deploys static checks as standalone TypeScript-AST scripts. Backtest verdict and forward trip-rate measure different populations.

**Fix.** Audit the deployment's mechanism *before* building the synthesizer's evaluator. Build the evaluator to materialize artifacts in the same mechanism. The materialized artifact from a successful backtest IS the deployment artifact.

### A5. Single-Thing About When the Relationship is Multi-Endpoint

**Symptom.** A relationship assertion has `about: <single thing>` with the second (or third) endpoint as a flat string field. The relationship is invisible from one of its endpoints' `wh thing about` queries.

**Fix.** Use Pair / Set per the four-direction test in `primitives.md` (or a named domain shape for a true 3-way relation). A single-thing `DuplicateAssertion` is the canonical failure; a Pair-about `Resolution` is the canonical pass. The *multi-valued* form of this anti-pattern is a JSON-stringified list of ids in a single string field (`evidence_ids: "[...]"`): use a native **wref array** (each member reverse-traverses via `refs --inbound`, cross-repo) or a relationship assertion instead — never a stringified blob. See [`field-level-design.md` § Multi-valued fields](../../modeling-foundations/references/field-level-design.md).

---

## Layered Co-Fingerprints

A single repo can match multiple fingerprints at different layers. This is the most-often-missed catalog pattern; treating fingerprints as alternatives produces graphs that ship with the wrong shapes for one of their layers.

### Worked example: an overnight build-and-learn loop (synthesize-and-test + ops-execution)

The same repo is simultaneously:

- **At the learning layer**, a synthesize-and-test atlas (#2): RunFinding, ReflectionDecision, scope-precedence (project > org > global), BDU triples on Preference and ScopeTransfer, keep/reject/defer hypothesis lifecycle. The graph synthesizes skill versions and validates them across runs.
- **At the run layer**, an operational state-tracking graph (#4): NightlyRun events, deployed code artifacts via worktrees + PRs into version control, validator commands as deterministic gates. The graph records what got executed, when, by whom, with what outcome.

The two layers interface at `RunFinding` (the learning-layer hypothesis-input) and `NightlyRun` (the ops-layer execution event). When designing layered co-fingerprints, the **interface shape between layers is itself a deliberate design choice** — not a leftover artifact.

### Worked example: a multi-agent research council (deliberative-synthesis + per-iteration-research-arc)

- **At the session layer**, a multi-persona deliberative synthesis graph (#9): Persona-as-Thing, Seat membership, cross-session scorecard, adversarial Critique.
- **At the per-iteration layer**, a research-arc foundation (#6) consumer: Hypothesis / Experiment / Measurement / Finding / Decision / Anchor — each iteration is an arc.

The interface is `Hypothesis.persona` (the per-iteration arc carries the persona attribution from the session layer).

### When to suspect layered co-fingerprints

- D2 = "both" (the graph has both pre-existing and synthesized objects at different layers).
- D5.2 = "multi-layer" (single + cluster + portfolio coexist).
- The same fingerprint match leaves significant shapes in your draft manifest unexplained — particularly shapes that bridge layers.

When you suspect layered co-fingerprints:

1. Match each layer to its own fingerprint. Note the catalog entry for each.
2. Identify the **interface shapes** that bridge layers (RunFinding bridges learning ↔ ops in the build-and-learn loop; Hypothesis.persona bridges session ↔ arc in the research council).
3. The interface shapes need their own design rationale — what's the bidirectional traversability story across the layer boundary?
4. Each layer's pitfalls apply independently. Walk both layers' "where it fails when transplanted" notes.

---

## How to extend this catalog

If you design a graph whose fingerprint is genuinely outside the entries here, write up a new entry with:
- The fingerprint (all 9 dimensions, with sub-axes for D5/D7/D8).
- The characteristic queries that earn the load-bearing shapes.
- The load-bearing shapes (with descriptions, not just names).
- One paragraph on *why* this combination works for this fingerprint.
- One paragraph on *where it fails when transplanted*.

A catalog entry is durable only when it explains the *fit between fingerprint and shape*, not just the shapes. Recipes without rationale rot the moment the domain shifts.
