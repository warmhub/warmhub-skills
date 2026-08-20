# Context-Free Reader Eval Templates

Checkpoint Gate 5 (see [`checkpoint.md`](checkpoint.md) § Question 5) requires that an external MCP agent with no project context can answer 3–5 specific questions about your graph using only `describeRepo`, `wh thing about`, `wh thing refs`, and `wh thing query`. The gate ships as prose discipline today; this file converts it into per-fingerprint templates so the test is concrete.

## How to use this file

1. Match your graph's fingerprint in [`pattern-catalog.md`](pattern-catalog.md). The fingerprint you match here determines which template block below applies.
2. Open the matching template section.
3. Fill in the placeholders (`<ProjectShapeName>`, `<wref>`, `<expectedValue>`) with your project's specific values.
4. Run each query through `wh` against your live repo.
5. Compare the actual output to the expected-answer pattern. Any deviation is a context-free-reader-contract failure that you fix at the manifest layer (descriptions, mirrored fields, etc.) — *not* by adding project documentation outside the graph.

These templates are deliberately stub-form. The placeholders are not implementations; they are *contracts*. Filling in 5 placeholders for your project takes 15 minutes; running the resulting eval takes seconds and surfaces real description-coverage gaps that prose discipline misses.

A runner that loads this file, prompts for the placeholders, and executes the queries with pass/fail reporting is a future improvement — for now, the per-fingerprint canned questions are the load-bearing contract.

---

## Template: Pattern #1 — Literature-Review Graph

```
Q5.1 — describeRepo identifies this as a literature-review graph.
  wh repo describe --repo <your-repo>
  Expected: the description mentions "claims", "sources", "review", and identifies the
  external source-proxy shape (e.g. ExternalSourceReference or your project's analog).

Q5.2 — Reverse traversal: from a source proxy, find all claims backed by it.
  wh thing refs <ExternalSourceReference/arxiv-XXXX.YYYYY> --inbound
  Expected: returns every ReviewedClaim (or analog) whose ClaimBasis points at this source.

Q5.3 — Certainty is reconstructable from assertions, not from a status field.
  wh assertion list --about <ReviewedClaim/example> --shape <CertaintyOpinion>
  Expected: at least one belief/disbelief/uncertainty assertion; the claim's current
  state is the most recent CertaintyOpinion, not a mutable field on the claim itself.

Q5.4 — A claim's full basis chain is one traversal.
  wh thing about <ReviewedClaim/example> --resolve-collections
  Expected: returns ClaimBasis assertions; each has mirrored claimWref + sourceWref
  + sourceKind + sourceIdentityKey so the reader doesn't need to resolve Pair members.

Q5.5 — Review events explain certainty changes (not a mutable status field).
  wh assertion list --about <ReviewedClaim/example> --shape <ReviewEvent>
  Expected: at least one ReviewEvent per change in certainty; each cites reviewer,
  certainty-before / certainty-after, and (if applicable) introduced source keys.
```

---

## Template: Pattern #2 — Synthesize-and-Test Atlas

```
Q5.1 — describeRepo identifies synthesize-and-test domain (synthesis + verdict + adoption).
  wh repo describe --repo <your-repo>
  Expected: descriptions name the synthesized-candidate shape, the verdict shape,
  the materialization-context shape, and the post-adoption evidence shape.

Q5.2 — Materialization context is content-addressed and bound to verdicts.
  wh thing about <BacktestResult/example> --resolve-collections
  Expected: a wref to MaterializationContextPolicy that records oracle-file exposure,
  fix-PR awareness, and other circularity-relevant inputs. The policy is content-addressed.

Q5.3 — Competing attributions preserve all alternatives, not just a winner.
  wh assertion list --about <FiledDefectIssue/example> --shape <MetaIntroductionHypothesis>
  Expected: returns one MetaIntroductionHypothesis with members and competingHypotheses;
  every AttributionHypothesis member carries its own BDU (belief/disbelief/uncertainty).

Q5.4 — Post-adoption evidence is wired up (the falsifiability ledger).
  wh assertion list --shape <LaterValidationSignal> --limit 5
  Expected: at least one signal per adopted remedy, with adjudication slot filled in
  for each (trip / catch / escape / control-drift / fp-observed).

Q5.5 — Cost telemetry is on every expensive derivation.
  wh assertion list --shape <MaterializationTrace> --limit 1
  Expected: a trace with per-step cost + convergence-signal fields, not opaque blob.
```

---

## Template: Pattern #3 — Governance / Proposal-Ratification

```
Q5.1 — describeRepo identifies proposal/ratification ceremony.
  wh repo describe --repo <your-repo>
  Expected: description names Proposal, ProposalVersion, Vote, Ratification, and
  whichever PolicyArtifact / ComplianceSignal shapes apply.

Q5.2 — Open proposals + their alternatives are one query (alternatives preserved with
  dismissalRationale even when not chosen).
  wh assertion list <Proposal/example> --shape <Alternative>
  Expected: every Alternative ever considered is returned (not just the chosen one);
  each carries a dismissalRationale field if it was not adopted.

Q5.3 — Votes traversable from both proposal side and voter side (Pair-about).
  wh thing about <Proposal/example> --resolve-collections --shape <Vote>
  wh thing about <Voter/example> --resolve-collections --shape <Vote>
  Expected: both directions return the same Vote assertions — the Pair-about works
  from either endpoint, not just the proposal side.

Q5.4 — Ratifications carry effective-from + rollback criteria as first-class fields.
  wh assertion list --shape <Ratification> --limit 1 --json
  Expected: data fields include effectiveFrom (timestamp) and rollbackCriteria
  (structured, not free-text), not buried in a description blob.

Q5.5 — ComplianceSignal stream is wired for ratified policies (bounded-continuous).
  wh assertion list --shape <ComplianceSignal> --limit 5
  Expected: at least one signal per ratified policy in the relevant period; each
  carries an adjudication slot for whether the policy is still serving its goal.
```

---

## Template: Pattern #4 — Operational State-Tracking

```
Q5.1 — describeRepo identifies operational telemetry domain.
  wh repo describe --repo <your-repo>
  Expected: description names ServiceProxy, DeploymentEvent, HealthSignal, and any
  FeatureFlagState / Incident shapes; identifies which are append-only events.

Q5.2 — Current deployed state is reconstructable from DeploymentEvent (append-only),
  no current-state shape exists.
  wh assertion list <ServiceProxy/example> --shape <DeploymentEvent> --all
  Expected: returns the event timeline; current deployment is "the most recent event"
  derived by sort, not a mutable field. No CurrentDeployment shape exists.

Q5.3 — HealthSignal stream is wired for every ServiceProxy (continuous evidence).
  wh thing about <ServiceProxy/example> --resolve-collections --shape <HealthSignal> --limit 10
  Expected: returns recent signals; absence of any HealthSignal for a service means
  adoption is unfalsifiable (D6=continuous gate failed).

Q5.4 — IncidentLink is Pair-about (incident endpoint and service endpoint queryable).
  wh thing about <Incident/example> --resolve-collections --shape <IncidentLink>
  wh thing about <ServiceProxy/example> --resolve-collections --shape <IncidentLink>
  Expected: same IncidentLinks reachable from both sides.

Q5.5 — FeatureFlagState is append-only events; current flag values are derived, not stored.
  wh assertion list --shape <FeatureFlagState> --limit 5
  Expected: events with timestamps + new value; no CurrentFlagValue shape; current
  state is the most recent event per (cluster, flag-key).
```

---

## Template: Pattern #5 — Pattern-Mining Atlas

```
Q5.1 — describeRepo names theme-synthesis pattern (clustering + recommendation).
  wh repo describe --repo <your-repo>
  Expected: description identifies ticket/transcript proxies, ThemeHypothesis as
  graph-synthesized, and the materialization-context shape.

Q5.2 — ClusterAssignment is Pair-about so tickets-per-theme and themes-per-ticket both work.
  wh thing about <TicketProxy/example> --resolve-collections --shape <ClusterAssignment>
  wh thing about <ThemeHypothesis/example> --resolve-collections --shape <ClusterAssignment>
  Expected: same assignments reachable from both sides.

Q5.3 — MaterializationContextPolicy records the clustering pass's inputs as content-addressed.
  wh assertion list --shape <MaterializationContextPolicy> --limit 1 --json
  Expected: data fields name corpusWindow, embeddingModel, promptVersion (or domain
  analogs); the policy is content-addressed (referenced by wref from ClusterAssignment).

Q5.4 — ThemeReviewEvent captures human PM judgment (confirm/refute/refine).
  wh assertion list --shape <ThemeReviewEvent> --limit 5
  Expected: every ThemeHypothesis that was reviewed has at least one ThemeReviewEvent
  with judgment + reviewer.

Q5.5 — ThemeOutcomeSignal is bounded-continuous post-adoption evidence.
  wh assertion list --shape <ThemeOutcomeSignal> --limit 5
  Expected: signals tied to InvestmentRecommendation wrefs with theme-volume deltas
  (bounded cadence — quarterly NPS or monthly retro, not continuous probes).
```

---

## Template: Pattern #6 — Research-Arc Foundation

```
Q5.1 — describeRepo identifies foundation-library status and lists the typed vocabulary.
  wh repo describe --repo <your-repo>
  Expected: description names Topic, Hypothesis, Experiment, Measurement, Finding,
  Decision, Anchor, Outcome, Actor, Claim — and identifies the repo as a foundation
  consumed by other repos.

Q5.2 — Each shape's description is *abstract* (no leaf-application assumptions).
  wh shape view <Hypothesis> --json
  Expected: description reads "a claim under empirical test" or equivalent; does
  NOT mention specific leaf applications (defect-prevention, autoresearch, etc.).

Q5.3 — Anchor refit chain is traversable: from any Measurement back through anchors
  to the originating Topic.
  wh thing refs <Measurement/example> --outbound
    -> Anchor -> previous Anchor -> ... -> Topic
  Expected: a single traversal walks the full refit chain to the Topic; intermediate
  Anchors are themselves traversable.

Q5.4 — Hypothesis lifecycle is reconstructable from Decision events, not a mutable field.
  wh assertion list <Hypothesis/example> --shape <Decision>
  Expected: at least one Decision per state change (adopted / rejected / deferred);
  current lifecycle is the most recent Decision, not a mutable status field on Hypothesis.

Q5.5 — Actor-as-Thing supports cross-session attribution queries.
  wh thing refs <Actor/example> --inbound
  Expected: returns every Hypothesis, Critique, or Decision attributed to this actor
  across all sessions — Actor is a durable Thing, not a session-ephemeral tag.
```

---

## Template: Pattern #7 — Iterative Metric Optimization

```
Q5.1 — describeRepo identifies metric-optimization loop + landedCommit linkage.
  wh repo describe --repo <your-repo>
  Expected: description names Hypothesis, Measurement, Anchor, Decision; identifies
  that Decision.landedCommit links iterations to real commits.

Q5.2 — Hypothesis trajectory: from current Anchor, history of all preceding measurements.
  wh thing refs <Anchor/current> --outbound
    -> previous Anchor -> Measurement -> Hypothesis (...iterate)
  Expected: walk through the refit chain returns the full measurement history.

Q5.3 — Each Decision records landedCommit + correctness-gate result.
  wh assertion list --shape <Decision> --limit 1 --json
  Expected: data fields include landedCommit (sha or wref) and correctnessGate
  (pass/fail/skipped); the gate result is structured, not buried in prose.

Q5.4 — MAD-confidence on Anchor is interpretable as noise-floor ratio (not BDU triple).
  wh shape view <Anchor> --json
  Expected: confidence is a single number field (e.g., madRatio: number) with a
  description explaining it's a signal-to-noise ratio. NOT a BDU (b, d, u, a) triple.

Q5.5 — Reject-paths preserved: failed hypotheses queryable to prevent re-exploration.
  wh assertion list --shape <Decision> --match "*/reject*" --limit 5
  Expected: rejected Hypotheses remain queryable with their rejection rationale and
  the Measurement that defeated them; not deleted or mutated to a different state.
```

---

## Template: Pattern #8 — Measurement-Series Atlas

```
Q5.1 — describeRepo identifies benchmark capture with commensurability contract.
  wh repo describe --repo <your-repo>
  Expected: description names BenchmarkSystem, Dataset, Metric, Measurement, and
  identifies commensurability metadata as first-class fields (not opaque metadata).

Q5.2 — Measurement.about carries (BenchmarkSystem, Dataset, Metric) — three-axis traversal.
  wh assertion list --shape <Measurement> --limit 1 --json
  Expected: aboutWref starts with `Triple/BenchmarkSystem+Dataset+Metric/...`,
  not a single-thing wref with the other two axes as flat-string data fields.

Q5.3 — Commensurability metadata are first-class graph fields.
  wh shape view <Measurement> --json
  Expected: fields include gitSha, repoState, latencyProfile, datasetVariant (or
  domain analogs) at top level — NOT a single `metadata` blob.

Q5.4 — Two arbitrary Measurements can be cross-checked for trend-comparability via
  a single graph query, not a regex over metadata blobs.
  wh assertion list --shape <Measurement> --match "*system-X*dataset-Y*metric-Z*" --json
  Expected: query filters can match on the structured commensurability fields;
  trend-comparison doesn't require parsing prose.

Q5.5 — Portfolio rollups across BenchmarkSystem are traversable.
  wh thing about <BenchmarkSystem/example> --resolve-collections --shape <Measurement> --limit 100
  Expected: returns every Measurement for the system; portfolio-level queries
  fall out of this without re-aggregating.
```

---

## Template: Pattern #9 — Multi-Persona Deliberative Synthesis

```
Q5.1 — describeRepo identifies multi-persona council + cross-session scorecards.
  wh repo describe --repo <your-repo>
  Expected: description names Persona, Seat, Critique, Hypothesis with attribution;
  identifies Persona-as-Thing (durable identity, not session tag).

Q5.2 — Persona is a durable Thing with attribution edges from every Hypothesis it generated.
  wh thing refs <Persona/example> --inbound
  Expected: returns every Hypothesis, Critique, and SessionOutcome attributed to
  this Persona across all sessions; non-empty even for retired Personas.

Q5.3 — Critique is multi-target (Hypothesis, Result, or Decision) and multi-author.
  wh assertion list --shape <Critique> --limit 5 --json
  Expected: aboutWref varies across {Hypothesis, Result, Decision} prefixes; a
  single target can have multiple Critique assertions from different authors.

Q5.4 — Hypothesis.premises[] and Hypothesis.discriminatesAgainst[] are wref-arrays,
  not flat-string fields.
  wh shape view <Hypothesis> --json
  Expected: premises and discriminatesAgainst are wref-typed arrays (or Pair-about
  on a separate Premise shape) — NOT string CSV.

Q5.5 — SessionOutcome rolls up per-session hypothesis convergence.
  wh assertion list --shape <SessionOutcome> --limit 5
  Expected: one SessionOutcome per session; lists which Hypotheses converged,
  which were deferred, and per-persona contribution scores.
```

---

## Template: Pattern #10 — Knowledge-Accumulation Graph

```
Q5.1 — describeRepo identifies retrieval-oriented knowledge graph.
  wh repo describe --repo <your-repo>
  Expected: description names Topic, Lesson, Learning; identifies retrieval as the
  primary use case (vector search over Lesson filtered by Learning.relevance).

Q5.2 — Learning is Pair-about (Topic ↔ Lesson) so both reverse-traversals work.
  wh thing about <Topic/example> --resolve-collections --shape <Learning>
  wh thing about <Lesson/example> --resolve-collections --shape <Learning>
  Expected: same Learning assertions reachable from both endpoints. (This was the
  smoke test used during script development.)

Q5.3 — Vector search over Lesson is filterable by Learning.relevance.
  wh thing search "<phrase>" --shape <Lesson> --limit 5
  Expected: results carry their Learning edges so a downstream filter on
  relevance.b can narrow to high-belief lessons. (Use --mode vector or --mode
  hybrid if available for semantic recall over text matching.)

Q5.4 — Topic.description is rich enough that an agent can decide whether to pull a
  Lesson under that Topic before reading the Lesson.
  wh thing view <Topic/example>
  Expected: description is non-trivial prose that answers "what does this Topic
  cover?" — not a one-liner like "topic for X".

Q5.5 — A Lesson's full topical context (all Learning edges) is one query.
  wh thing refs <Lesson/example> --inbound
  Expected: returns every Pair (Topic, Lesson) containing this Lesson, so the
  reader sees all Topics this Lesson has been tagged into.
```

---

## Template: Pattern #11 — External-Proxy Analysis Graph

```
Q5.1 — describeRepo identifies external-proxy + relationship-analysis pattern.
  wh repo describe --repo <your-repo>
  Expected: description names the proxy shapes (TicketProxy, Vent, etc.) and
  the relationship-assertion shapes; identifies BDU-on-edges as the certainty model.

Q5.2 — Relationship assertions use Pair / Set / Triple about — never single-thing
  about with flat-string endpoints. This is the canonical Gate 2 failure surface.
  wh assertion list --shape <DuplicateAssertion> --limit 1 --json
  wh assertion list --shape <Resolution> --limit 1 --json
  Expected: aboutWref starts with `Pair/`, `Set/`, or `Triple/` — never a bare
  `Proxy/...` wref with the other endpoint hidden in data fields. (Running
  `verify-relationships.mjs` over this fingerprint is recommended.)

Q5.3 — From any external proxy, all relationships pointing at it are traversable
  via wh thing refs --inbound (both same-repo and cross-repo).
  wh thing refs <TicketProxy/example> --inbound
  Expected: returns every Pair / Set / Triple containing this proxy, across same-repo
  and cross-repo refs in one call.

Q5.4 — CertaintyOpinion lives on the relationship assertion, not on either endpoint.
  wh assertion list <DuplicateAssertion/example> --shape <CertaintyOpinion>
  Expected: BDU triple is asserted about the relationship's wref, not about either
  endpoint's wref.

Q5.5 — Human-confirmed-or-refuted relationships have an attached ReviewEvent.
  wh assertion list <DuplicateAssertion/example> --shape <ReviewEvent>
  Expected: every relationship that was reviewed carries at least one ReviewEvent
  with judgment + reviewer + certainty-before / certainty-after.
```

---

## Template: Pattern #12 — Cross-Repo Substrate-Split

```
Q5.1 — describeRepo (on both repos) identifies which is substrate and which is consumer.
  wh repo describe --repo <substrate-repo>
  wh repo describe --repo <consumer-repo>
  Expected: substrate's description names it as a foundation-library role and lists
  identity-substrate shapes; consumer's description names which substrate(s) it
  references via cross-repo wrefs.

Q5.2 — From a substrate entity, wh thing refs --inbound returns BOTH same-repo refs
  AND cross-repo refs from the consumer repo in one call.
  wh thing refs Facility/example --repo <substrate-repo> --inbound
  Expected: result includes same-repo Demographics / FrsProgramLink AND cross-repo
  EmissionsRecord from the consumer repo, in one response. (Cross-repo refs
  appear in the inbound list when consumer repos hold typed wrefs into the
  substrate.)

Q5.3 — Substrate's foundation-library discipline is visible.
  wh shape list --repo <substrate-repo>
  wh shape view Facility --repo <substrate-repo>
  wh shape history Facility --repo <substrate-repo>
  Expected: shape names are abstract (not consumer-specific); shape history is
  additive-only (no field renames or removals across versions).

Q5.4 — Consumer's high-volume shapes use cross-repo wrefs to substrate entities.
  wh assertion list --shape <EmissionsRecord> --repo <consumer-repo> --limit 1 --json
  Expected: aboutWref or a data field carries a wref pointing into substrate-repo,
  pinned with @vN. NOT a duplicated identity string or local copy of the
  substrate entity.

Q5.5 — Sample-friendly naming on substrate entities lets consumer batch-fetch.
  # Build a list of known substrate ids and batch-fetch their deterministic wrefs.
  echo -e "Facility/id-1\nFacility/id-2\nFacility/id-3" | wh thing view --file=- --repo <substrate-repo>
  Expected: 1000 deterministic substrate IDs become 1000 wrefs and resolve in
  one or two paginated calls; no enumeration of the full substrate is needed.
  (The --file=- form reads wrefs from stdin; see `wh thing view --help`.)

Q5.6 — A reader holding ONLY a consumer thing (no access to the substrate repo)
  can still interpret its cross-repo wref field from the field description alone.
  wh thing view <ConsumerThing> --repo <consumer-repo> --json
  wh shape view <ConsumerShape> --repo <consumer-repo>
  Expected: the wref field's description names the target shape, the join-key
  semantics, AND the unresolved-target policy — e.g. "resolved NIC RSSD identity;
  optional, absent until the host link-resolver lands it; raw key in rssdRawKey".
  A reader can distinguish a resolved link from a not-yet-resolved one, and never
  finds an unresolved raw string sitting in the wref-typed field.

Q5.7 — A reader landing on a substrate entity (the linked thing), with no access
  to any consumer repo, reads it as a self-standing identity and knows reverse
  links are discoverable rather than absent.
  wh thing view Facility/example --repo <substrate-repo>
  wh thing refs Facility/example --inbound --repo <substrate-repo>
  Expected: the substrate entity is fully interpretable on its own (identity +
  enrichments described in-shape; it does NOT depend on knowing who links to it);
  reverse cross-repo links are found via refs --inbound — not assumed absent
  because reverse `wh thing about` returned nothing.
```

---

## Cross-cutting questions (apply to every fingerprint)

These five run on every graph regardless of fingerprint:

```
QU.1 — describeRepo output is non-trivial. Every shape has a non-empty description;
  every field has a non-empty description. No "TODO" placeholders.

QU.2 — Hierarchical names encode stable identity, not mutable state. No shapes named
  with rank, queue, status, or needs-* suffixes.

QU.3 — Append-only revision is visible: no shapes are mutated in place. State changes
  flow through certainty / basis / review / decision assertions.

QU.4 — Pair / Triple / Set / List targets have convenience fields
  (subjectWref, objectWref, kind, identityKey) mirrored on the assertion for
  context-free reader legibility.

QU.5 — For D3 = expensive domains, every derived verdict carries a content-addressed
  policy / mechanism wref. For shapes with ingest-time semantic mappings, every such
  field carries a mappingPolicyWref.

QU.6 — Any wref-typed field that can point across a repo boundary declares its
  unresolved-target policy in its description, and never stores an unresolved raw
  string in a wref-typed field (raw join keys live in a separate plain-string
  field). See cross-repo-linkage.md.

QU.7 — Join-target backbone repos are self-describing to consumers.
  wh repo describe --repo <substrate-repo>
  wh shape view <BackboneShape> --repo <substrate-repo>
  Expected: the shape description names the durable join key, whether consumers
  should pin or re-resolve, and which v1/v2 shape/key is current. Deprecated or
  migrated shapes point readers at the successor and migration policy.

QU.8 — Deferred primitives are visible as alpha-stage contracts, not hidden gaps.
  Inspect repoDesignSummary/assertionModel and ingestion.deferredPrimitives.
  Expected: every staged id-hint has an approved future primitive, accepted
  pitfall, migration trigger, and re-derivable source fields. No wref-typed field
  contains an unresolved raw string.
```

Run these against your graph regardless of which fingerprint-specific block above also applies.

---

## How to fail gracefully

If your graph fails one of these queries, the failure is **always** a manifest-layer fix, not a documentation-layer workaround:

- Missing descriptions → edit the manifest's shape and field `description` fields.
- Missing mirrored fields → revise the shape to include them; old assertions can stay (descriptions on existing fields can usually be filled retroactively without retract-replay).
- Missing policy/mechanism wrefs → add the field to the shape; backfill the wref on new assertions; live with the gap on historical ones or plan a retract-and-replay.
- Wrong `about` arity (Gate 2 failure surfaced here) → plan a retract-and-replay migration per [`migrations.md`](../../build-warmhub-repo/references/migrations.md).

Adding a project README, comment, or sidebar doc to "explain what the graph means" is *not* a fix — it doesn't survive the context-free-reader contract because the agent doesn't have access to it. The graph must explain itself through `describeRepo` and the shape/field descriptions.
