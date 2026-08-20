# Universal Design Foundations

These rules apply to every WarmHub repo regardless of which model fingerprint matches your domain. Read this *after* you've matched a fingerprint in `pattern-catalog.md` and *before* you load data. The shape names used in examples below are illustrative — translate them into your domain's nouns per the rule in `SKILL.md` § Workflow step 3.

If a rule below conflicts with something in `pattern-catalog.md` for your fingerprint, the catalog wins for that specific aspect — write down which rule is being overridden and why. Most overrides are wrong; flagging them keeps the override honest.

---

## Durable Shapes vs Derived Queries

Use durable shapes for entities or assertions that should retain meaning across revisions. Use queries for state that should change when assertions change.

**Shape candidates** (any fingerprint):
- Source proxies (external identity references — papers, commits, tickets, services).
- Authored, durable assertions about those proxies (claims, hypotheses, classifications, verdicts).
- Provenance edges (basis, support, contradiction, replication, reproduction).
- Certainty state (belief / disbelief / uncertainty for graphs that need full uncertainty composition; confidence score for simpler domains — see `dimensions.md` § D8).
- Review or critique events with attribution.
- Decision events with rationale and rollback criteria.
- Continuous-evidence signals (only if your fingerprint includes D6: continuous evidence).

**Query candidates**:
- Current rankings, queues, "needs more support," "best review target."
- Internal-only claims, weakly grounded central claims, source-grounding profiles.
- Portfolio rollups (overall trip rate, override rate, cost rollup).

**Anti-pattern.** Do not create durable debt/task shapes (`ReviewDebt`, `NextReviewTarget`, `NeedsSupport`) merely because something currently needs work. In an append-only graph, stale debt accumulates. Represent the state through certainty + basis + review/critique; derive the queue from current graph state.

## Source Ownership

WarmHub owns assertions, not source bytes.

Keep source material externally addressable by stable identity:
- arXiv, DOI, Semantic Scholar, canonical URLs.
- Git repo, commit SHA, path, blob/tree SHA.
- External system ids (ticket id, service uri, deployment-event id).
- PDF or file content hash as a proxy when needed.

Use source proxies as graph nodes. Make claims, certainty, evidence, provenance, contradiction, replication, reproduction, and decision assertions about those proxies.

If your fingerprint is `D1: graph-internal` (governance, internal proposals), the graph *is* the source of truth for the original objects — but as soon as those objects produce deployed artifacts (a ratified policy, a deployed lint rule), those artifacts re-become external proxies. Don't model the deployment artifact as a graph-internal thing.

### Host-owned derivations vs public graph fields

Keep resolver internals out of public graph semantics. Parser scores, fuzzy-match scores, OCR text,
LLM extraction traces, candidate-ranker features, and resolver confidence are usually **host-owned
derivations**: they explain how the importer decided what to write, but they are not durable claims
the graph should ask future readers to trust without a policy.

Use this boundary:

- **Public field:** stable source identity, canonicalized value, raw source value needed for audit, or
  a resolver decision the graph's questions depend on.
- **Host-owned field:** intermediate score, prompt trace, parser token stream, failed candidate list,
  or private resolver feature.
- **Public assertion:** authored interpretation with provenance, policy, confidence, and a target that
  passes the four-direction test.

If OCR, LLM extraction, fuzzy matching, or semantic parsing produces a value that readers will group,
join, or reason over, treat it as a `D3: expensive` derivation: keep the raw source value, write the
derived semantic value, and bind the instance to a `mappingPolicyWref` or content-addressed policy
identifier. A changed extractor then creates an explicit retract/replay or revise decision instead of
silent drift.

## Verify Platform Mechanisms Before Encoding

A surprising share of design contortions trace back to a *belief about how the platform behaves* that was never actually run. The failure mode: a designer encodes "the platform can't do X" into the schema — downgrades an `Arc` to single-`about` plus a denormalized string, or simulates a link with an extra per-domain assertion and a subscription reactor — working around a constraint that turns out to be largely imaginary.

A real example. A consumer's topology spec asserted, verbatim: *"cross-repo `about` references are not supported; `wh thing about` only resolves within the writing repo; the write pipeline verifies `about` targets exist in the writing repo."* Two of those three clauses are false — cross-repo `about` writes succeed, and target existence is validated *across* repos. The one true clause (reverse `about` is repo-local) had a clean answer the spec never reached: a typed wref field traversed with `refs --inbound`. The schema was bent around a constraint a 60-second test would have dissolved.

**The smell.** Have you encoded a belief about a platform mechanism — *resolution scope, validation scope, field-type support, index behavior* — that you have not actually run on this platform version? If so, stop and probe before the belief shapes a shape. Beliefs about the platform are claims like any other; in this graph, an unverified claim doesn't get to silently become structure.

**The probe (a throwaway two-repo test, ≈60 seconds).** Most platform-mechanism beliefs are decidable with two scratch repos and a few commands. The canonical one — does reverse traversal cross a repo boundary?:

```bash
ORG=<throwaway-org>                              # a scratch org/profile
wh repo create $ORG/probe-a -P dev
wh repo create $ORG/probe-b -P dev

# target thing in A; in B, a thing whose shape declares `link` as a wref field,
# pointing cross-repo at A's target:
wh commit submit --repo $ORG/probe-a -P dev -m probe \
  --ops '[{"operation":"add","kind":"thing","name":"Target/t1","data":{}}]'
wh commit submit --repo $ORG/probe-b -P dev -m probe \
  --ops '[{"operation":"add","kind":"thing","name":"Consumer/c1","data":{"link":"wh:'"$ORG"'/probe-a/Target/t1"}}]'

# reverse traversal from the TARGET's repo — the two indexes diverge here:
wh thing about Target/t1 --repo $ORG/probe-a -P dev          # about-index: repo-local — returns 0, won't see B
wh thing refs  Target/t1 --inbound --repo $ORG/probe-a -P dev # refs-index: fans out cross-repo — returns Consumer/c1

wh repo archive $ORG/probe-a -P dev ; wh repo archive $ORG/probe-b -P dev   # tear down
```

Substitute whatever mechanism you're unsure about: write a cross-repo `about` and see whether it's rejected; declare a field type and see whether it validates; revise a referenced shape and see what form the wref resolves to. The *observed result* — not a remembered constraint — drives the design. This pairs directly with the four-direction test's repo-boundary note ([`primitives.md` § The four-direction test across a repo boundary](primitives.md)): the test's object-side answer depends on platform scope behavior, so verify the behavior before concluding a relationship "isn't traversable."

## Field-Type Vocabulary and Local-vs-Live Ratchet

Use this vocabulary when declaring fields:

- scalar: `string`, `number`, `boolean`, `wref`
- arrays: `{"type":"array","items":"string"}` or `{"type":"array","items":"wref"}` (and the same
  pattern for other supported scalar items when verified on the target platform)
- optional: suffix the field key with `?`, for example `"sourceWref?": "wref"`

Do not encode lists as JSON strings. Do not encode traversable references as `string` fields. Use
`wref` for a single traversable reference and native `wref` arrays for multi-valued references whose
edge itself carries no data.

**Local-green is not live-green.** A TypeScript type-check, local JSON fixture, or dry-run emitter can
prove your code built an object; it cannot prove WarmHub accepted the field syntax, pinned wrefs,
indexed refs, or returned the shape through the same read path a context-free reader will use. Before
adoption, run a live shape registration plus one bounded write/readback for every field form that is
new to the project.

## Hierarchical Thing Names

A name is not a label — it **is** the thing's identity, and its shape is the primary
interface two audiences use to navigate the graph: **humans visually reconstruct
structure from names** (a `/`-delimited hierarchy reads like a filesystem; flat opaque
names read like a hash dump), and **humans and agents query by name prefix** (a coherent
hierarchy turns the name space into a free glob index — `QualityFinding/<org>/<repo>/pull/142/*`
returns every finding on one PR with no field scan). Naming rigor is therefore a
first-class design activity, not a formatting pass. This section is the summary; the
full treatment — with worked example, the convergence/one-authority discipline, and a
checklist — is in [naming.md](../../design-warmhub-repo/references/naming.md).

Use hierarchical names so that identity is visible and every prefix is a meaningful set.

Good names should be:
- Stable across revisions (a rename is a retract-and-replay migration, not an edit).
- Readable in query output without extra lookup — hand someone one wref and they can
  say what it is and where it sits.
- Scoped by domain or source, broadest segment first, with `/` as the structural
  delimiter and org/repo as separate segments (so you can glob one level independently).
- Scoped by a small fixed vocabulary (`pull/`, `scan/`, source-kind) a reader learns
  once and can predict.
- **Identity, never metadata.** No provenance (source, loader, harness), certainty,
  status, or queue rank in the name — those are assertion data. Two producers that
  describe the same real-world entity must compute the *same* name; anything that
  varies between them is metadata, not identity.
- Free of mutable state (queue rank, current priority, current certainty, "needs review").

**Useful patterns.**
- `<Shape>/<stable-id>`
- `<Shape>/<source-kind>-<source-id>`
- `<AssertionShape>/<review-or-import-batch>/<target-id>/<source-id>`
- `<EventShape>/<event-kind>-<target-id>`

**Examples (across fingerprints — names are illustrative).**
- Literature review: `ReviewedClaim/gate2-claim-013`, `ExternalSourceReference/arxiv-2601.03192`, `ClaimBasis/gate4-gate2-claim-013/arxiv-2601.03192`.
- Synthesize-and-test: `FiledDefectIssue/2266`, `Topic/canonical-read-access`, `BacktestResult/2266-static_analysis-5/v3`.
- Governance: `Proposal/2026-eng-onboarding`, `Ratification/2026-eng-onboarding/v2`.
- Ops: `ServiceProxy/prod-us-east-checkout`, `DeploymentEvent/checkout/sha-13bf9c2`.

**Avoid.**
- `Claim/1`, `Thing/new`, `ReviewTarget/rank-1`, `Claim/needing-support`.
- Names that duplicate mutable certainty, queue state, or review status.

If two stable names exist, prefer the one that makes graph output understandable to a reader who has only the wref.

**Sample-friendly naming.** Where a shape is expected to have many instances *and* downstream consumers may want to operate on stratified subsets without enumerating the full shape, prefer deterministic names from known stable seeds. `<Shape>/<seed>/<suffix>` is sample-friendly; `<Shape>/<uuid>` is not.

The sample-first analytical workflow reduces to: build a list of seed IDs, construct the deterministic wrefs, batch-fetch. This only works if names are predictable from the seed. The cost gap is large in practice — a batch fetch of 1,000 instances with deterministic names completes in two calls (seconds); an equivalent full-scan enumeration is hours.

Use opaque names (UUIDs, hashes, sequence numbers) only when no stable seed exists or instance count stays small. When in doubt about future analytical access, prefer deterministic.

**Leaf by semantics.** Choose the narrowest segment by the entity's identity: a 1:1-unique source id (a comment id) keeps cross-system crosswalks deterministic; a content hash of the defining fields makes a recurring entity collapse to one node so *recurrence is derived from the name, not stored as a flag*.

**Content-addressed boundaries are `/`-segments, not version pins.** When a thing is versioned by content (a policy, an eval spec), append the content hash as a name segment (`QualityPolicy/standard-gate/sha256-…`), never with `@` (reserved for wref version pins and rejected inside a thing-name segment). Old verdicts under the prior hash stay valid history, and staleness is visible in the name.

**One naming authority.** Build names in exactly one place every producer calls — a shared naming function, or a written contract every importer follows verbatim — with input canonicalization *inside* it so variant spellings of one entity (`cart.ts`, `src/cart.ts`, `web/src/cart.ts`) converge to one node. Without this, each lane forks identity silently and the four-direction test still passes on each fork. See [naming.md](../../design-warmhub-repo/references/naming.md) for the worked example.

## Verbatim Source Plus Semantic Derived Fields

When a shape ingests source-system values that need interpretation, store the raw source value and the derived semantic value as paired fields. See [`pattern-catalog.md` § Cross-Cutting Field-Design Patterns](../../design-warmhub-repo/references/pattern-catalog.md#cross-cutting-field-design-patterns) for the full pattern with fingerprint, load-bearing fields, and worked example. This pairs with **Stale-Verdict Retraction Discipline** below: when the mapping changes, the policy wref bridges the raw and semantic fields so retroactive changes surface as shape-level events rather than silent drift.

## Shape and Field Descriptions

Treat `shape.description` and per-field `description` as part of the shape definition, not documentation garnish.

`describeRepo` is one of the most important agent-facing interfaces for a WarmHub repo. It lets a context-free agent infer the represented domain, available shapes, safe traversals, and meaning of each field — without your project context.

**For each shape, the description should answer:**
- What does this shape represent?
- Is it a thing, an authored assertion, a source proxy, an event, a derived collection, or operational state?
- When should an agent create it?
- What common confusion should an agent avoid? (e.g. "this is the *evidence* source, not the *subject* artifact")

**For each field, the description should answer:**
- What does this field identify or assert?
- Is the value stable identity, provenance, evidence, interpretation, certainty, or a mirrored convenience helper (for context-free legibility)?
- Which shape or external identity does it point to, if any?
- Is it source-of-truth or derived convenience data?

If `describeRepo` cannot teach another agent how to ask correct graph questions about your repo, the repo is not ready for broader adoption. Description gaps cause graph-reader errors that are very hard to debug from the outside.

## Field-Level Shape Design (Entity Discovery)

The four-direction test catches relationship defects; it doesn't catch *entity* defects. A shape can pass the four-direction test cleanly while carrying 66 fields, 28 of which describe the voter's *precinct* — a hidden entity copied onto every voter in it instead of pointed at once — plus 12 sparse rural-only fields (a sub-entity), two derived (`age_at_year_end`) that rot with calendar time, and a filter surface far wider than anything you'd ever navigate by.

The full lens lives in [`field-level-design.md`](field-level-design.md) — eight entity-discovery tells + the split-or-inline decision + worked example. Apply it whenever a shape carries more than ~25 fields, whenever any shape is on a >100K-instance population, or whenever you're ingesting from a flattened source (CSV exports and flattened API responses almost always carry repeated clusters the source system actually kept as separate entities).

**The split-or-inline rule in one line.** Split out genuine entities — repeated clusters, lookups, sparse sub-entities — into their own Things you traverse to; keep *matching-critical fields* inline on the hot-path shape, even when they introduce some repetition. Splitting everything out makes one read fan out into many wref resolutions; inlining everything copies a hidden entity onto millions of things. The balance is fingerprint-aware: enumeration-dominated graphs tilt toward splitting more out; point-lookup-matching graphs (donor reconciliation, identity resolution) tilt toward inlining the matching-critical fields.

This rule interacts with **Source Ownership** above (matching-critical fields are usually source-derived identifying data, so inlining them mirrors what an external matcher will read), **Verbatim Source Plus Semantic Derived Fields** (the canonical fix for tell 6 — unparsed strings get a raw + canonical pair, not just one or the other), and **Append-Only Revision** (splitting shared shapes out of a populated graph is a retract-and-replay migration; deterministic names on the split-out shapes are load-bearing for re-ingest survival).

## Context-Free Legibility

> The primary rule is in [`primitives.md` § The Traversability Contract](primitives.md). This section covers the *secondary* readability concern that arises after the primary contract is satisfied. Get `about` arity right first (per primitives.md and the four-direction test); then apply the mirroring rule below for context-free reader legibility.

If the native assertion target uses an `Arc`, `Bond`, `Set`, `List`, or other collection edge target, mirror the practical traversal fields onto the assertion.

For a basis-style assertion, include fields like:
- `<subject>Wref` (e.g. `claimWref`, `hypothesisWref`)
- `<basis>Wref` (e.g. `sourceWref`, `evidenceWref`)
- `<basis>Kind` (e.g. `sourceKind`, `evidenceKind` — `arxiv` / `git` / `internal-doc`)
- `<basis>IdentityKey` (the stable external id of the basis)

This prevents context-free readers from mistaking the subject artifact for the evidence source. The native `Arc` traversal stays — but the mirrored fields make the assertion legible without it.

## Certainty as State (Where D8 Calls For It)

Use certainty to encode epistemic status:
- High uncertainty → still needs review.
- High disbelief → likely contradicted or rejected.
- Low belief with caveats → do not promote downstream.
- Lower uncertainty after independent basis → review pressure decreases.

Do not rely on a separate mutable task status as the primary state. In an append-only graph, review status should be reconstructable from assertions.

For `D8: simple` domains, a `confidence: number` field is enough. For `D8: competing+BDU` domains, use full belief / disbelief / uncertainty triples per assertion. If multiple independent sources write BDU opinions about the same binary propositions and the repo needs trust-weighted merging, route to [../../veritas-design/SKILL.md](../../veritas-design/SKILL.md). Use `subjective-logic` for operator arithmetic when that skill is installed; use Veritas for component-backed source reputation, Oracle, and `Consensus` design.

## Review and Critique Events

Use review events for human (or agent) judgment passes that change graph state:
- Single-author review of a single target → `ReviewEvent`-style shape.
- Multi-actor critique that can target hypothesis-or-result-or-decision → `Critique`-style shape (multi-target authored assertion).

Both can coexist in the same graph; they answer different questions. See `dimensions.md` § D7 for which fingerprints want which.

A review event captures:
- Target.
- Review kind (initial, replication, contradiction, escalation).
- Judgment.
- Reviewer.
- Note path or wref to longer-form review notes.
- Independent source keys (if the review introduced new bases).
- Certainty before / after.
- Scope change, basis change.

Review events are not the queue. They are evidence that a review happened and explain how it changed graph state. The queue is a query over current graph state.

## Append-Only Revision

Never model "done" by deleting prior state.

Move from "needs more support" to "has enough support for now" by adding or revising:
- Basis (new support / counter-support).
- Certainty (belief / disbelief / uncertainty changes — for D8: BDU domains; or confidence updates for simple).
- Review or critique (why certainty / basis / scope changed).
- Decision (adopt / reject / defer with rationale).
- Continuous-evidence signals (for D6: continuous domains — see `pattern-catalog.md`).

Use certainty (or its simpler analog) as the lever, not a mutable status field.

### Snapshot absence policy

Absence in a source snapshot is not one fact. Choose the policy by the source's snapshot character
before the first backfill:

| Snapshot character | Missing row means | Graph policy |
|---|---|---|
| Full snapshot of the authoritative population | The entity no longer appears in the source population | Write a deactivation/status assertion or revise a lifecycle field; do not delete history. |
| Active-only snapshot with known publication lag | The entity might be inactive, delayed, filtered, or missing due to lag | Mark for review or write a low-certainty freshness signal; do not deactivate automatically. |
| Later full snapshot after a prior partial feed | Prior absence was not authoritative | Field-flip or revise the freshness/lifecycle assertion when the full feed resolves it. |
| Immutable event stream | Missing from this run says nothing about prior events | Ignore absence; idempotency and event identity carry the state. |

For backbone or substrate repos, deactivation can break downstream cross-repo resolution assumptions.
If consumers pin wrefs to historical versions, deactivation may be fine; if they float or re-resolve,
publish the successor/alias policy and schedule dangling-link checks before changing lifecycle state.

### The recompute cost ladder

A frequent over-fear: "writing a derived metric back into the graph means a retract-and-re-add dance on *every* recompute — so keep derived metrics in build-time JSON and never persist them." That collapses three different operations into the most expensive one and talks teams out of write-back they could afford. Match the change-type to its tier:

| Tier | Change type | Operation | Cost |
|---|---|---|---|
| **1** | Same instance, value refresh — the deterministic name is unchanged | `revise` | Cheap — append-only, one write, full history retained |
| **2** | The derived *population* changes between runs — some instances should no longer exist | retract the dropped instances + add the new ones (**instance-level** retract-and-replay) | Moderate — still append-only; `revise` alone can't remove an instance whose cause dropped out |
| **3** | The shape or the `about` arity changes | retract-and-replay **with dependent cascade** | Expensive — this is the [`migrations.md`](../../build-warmhub-repo/references/migrations.md) case |

Most write-back is tier 1 or tier 2, not tier 3. A derived metric with a **deterministic name** and `about: <single thing>` refreshes in place with `revise` (tier 1) — no retract, no collection dance. A consensus value named `ConsensusBelief/<event>-<cause>` with `about: <event>` is refreshed by its upstream job purely through `revise`; nothing is retracted unless the *cause itself* drops out of the population (then it's tier 2 — retract that one instance).

The design levers that keep you on the cheap tiers: **deterministic names** (a refresh reuses the same identity → tier 1) and **single-thing `about` where the relationship genuinely has one subject** (so a value change isn't a collection retract-replay). If a recompute *feels* like it forces tier 3, check whether the name is non-deterministic or the `about` arity is heavier than the relationship needs — that mis-design, not append-only itself, is usually the real cost. (For cross-repo links, retract-and-replay also cascades through the inbound wref fields that target the retracted instance — see [`cross-repo-linkage.md`](cross-repo-linkage.md) § Lifecycle & orphan policy prompts.)

## Stale-Verdict Retraction Discipline

When a derivation rule, evaluator mechanism, or scoring policy changes, the verdicts produced under the old policy don't disappear from an append-only graph. Without discipline, old and new verdicts coexist without a flag, and queries can't tell them apart.

**Rule.** Bind every derived verdict — *and every ingest-time semantic mapping* — to a content-addressed policy / mechanism wref. When the policy or mechanism changes, retract affected verdicts before deriving new ones. Retraction is append-only — it doesn't delete the old verdict, just marks it superseded by a new one under a new policy. Queries filter on policy wref to avoid mixing populations.

This applies to `D3: expensive` domains most strongly. For `D3: cheap` domains where regeneration is free, you may instead just regenerate without retraction, but the policy wref is still useful as documentation.

**Scope extension: ingest-time semantic mappings.** The same drift-failure-mode applies one level earlier in the pipeline. Any shape that stores a semantically-mapped field at ingest time (see § Verbatim Source Plus Semantic Derived Fields above — `<field>Raw` paired with derived `<field>`) should also carry a `mappingPolicyWref` (or commit-message-stable mapping-version identifier). Without this, when the mapping table is later edited — a previously-unmapped source value gets a new semantic mapping, an old mapping is corrected — retroactive interpretations of existing instances drift silently. With the policy wref bound to each instance, retroactive mapping changes surface as shape-level events that can be retracted and replayed cleanly.

The natural pairing: `<field>Raw` preserves the source-verbatim value, `<field>` carries the derived semantic value, and `mappingPolicyWref` makes the bridge between them explicit and content-addressed.

The retraction-and-replay pattern generalizes beyond policy-change. When `about` arity, shape semantics, or subject changes mid-flight on a graph that already has data, the same retract-and-replay shape applies — with one critical extra concern: the retraction *cascades* through every dependent assertion targeting the retracted assertion, because their own `about` is also immutable. See [`migrations.md`](../../build-warmhub-repo/references/migrations.md) for the cascade discipline (deterministic v2 names for idempotency, `migratedFrom` audit-trail field, per-row atomicity, full cascade enumeration via `wh assertion list --about <retracted-wref>`).

## Question Catalog as Contract

A WarmHub repo's purpose is to answer questions that text search and dashboards can't answer alone. Maintain an explicit question catalog where:
- Each question has a stable id (`Q§.N`).
- Each shape "earns its place" by citing which question(s) it serves.
- Adding a shape requires citing the Q(s) it unlocks or enriches.
- Retiring a shape requires citing the Qs that go dark.
- New questions are added as the domain matures.
- An anti-queries section explicitly lists questions the graph declines to optimize for, with reasons. (This converts "shouldn't we ask X?" from a recurring derail into a one-line response.)

The catalog is editable. The discipline is not. Without it, graphs accumulate shapes whose purpose is forgotten; with it, retirement is a clean operation rather than a refactor.

For the structured format and worked examples, see [`query-catalog-template.md`](../../design-warmhub-repo/references/query-catalog-template.md). Two exemplars are referenced there: a literature-review wiki's pre-shape catalog and a defect-prevention atlas's multi-query north-star. **Entry A (query-first)** uses the template upfront; **entries B / C / D** use it as a post-hoc audit format.

## Context-Free Reader Contract

A WarmHub repo should explain itself to an agent with no project context. At minimum the graph should answer:
- What shapes exist and what do their fields mean?
- Which fields identify source identity, evidence, certainty, and review provenance?
- Which assertions are grounded by external sources versus graph-internal artifacts?
- Which assertions changed state and why?
- What is the next review queue (or its domain analog), and how was it derived?

Encode the expected exact answers as an executable eval. Adoption is gated on this eval passing, not on shapes being installed.

## Adoption Gates

A repo is not ready for broader adoption until each of the following holds. The list adapts per fingerprint — all gates apply to every fingerprint, but what counts as evidence varies.

1. **Source identity stable.** External proxies use the source system's canonical identity; no position-based or sequence-based names.
2. **Manually-reviewed seed data exists.** Whatever the fingerprint's "review" looks like (literature review, governance vote, ops curation, council adjudication), at least one round has happened and is recorded.
3. **At least one graph traversal produces value not available from text search or a dashboard.** This is the existence proof that the graph earns its complexity.
4. **Independent review can revise certainty and basis.** A second reviewer / agent / pipeline can produce assertions that shift state without editorial conflict.
5. **Write-back is reviewable and does not damage canonical editorial surfaces.** If the graph proposes wiki edits, IaC changes, lint configs, the proposed changes go through the target system's normal review.
6. **Continuous-evidence stream is wired up (D6: continuous fingerprints only).** Adopted assertions have a forward-evidence shape with adjudication slots; thresholds for revise / rollback are explicit. Without this gate, adoption is unfalsifiable for continuous-evidence domains.

If a graph cannot answer context-free questions about its own shape atlas, source grounding, review events, and next-review-target (or domain analog), keep it alpha-stage. Use local docs and query notes to keep a diary of gate decisions.

## Foundation-Library Discipline (D9 = foundation library)

When the graph is consumed as a WarmHub component by other repos (D9 = foundation library), additional constraints apply that don't exist for leaf applications. These are *strict* — violating them cascades breakage through every consumer.

- **Additive-only shape evolution.** Adding new shapes is fine; adding optional fields to existing shapes is fine; removing or renaming shapes / fields is not. Once a shape ships in a foundation, downstream repos depend on its name and field set as a contract.
- **Versioned manifest with negotiated upgrades.** Major-version bumps that add required fields require migration coordination with consumers. Minor versions are additive; major versions can change semantics with consumer notification.
- **Install-path independence.** Consuming repos won't all have the same directory layout. Skills, scripts, and tooling tied to the foundation must work regardless of where the consumer's repo root sits. No hardcoded relative paths beyond `<repo-root>/warmhub/manifest.json`.
- **Backward-compatible reads on retracted shapes.** When a foundation deprecates a shape, the graph must still resolve queries against retracted-but-historical instances of that shape from existing consumer data. A foundation can't break a consumer's history.
- **Conservative naming.** Foundation shape names are durable identity that downstream repos hardcode in queries. Reserve generic-sounding names (`Hypothesis`, `Experiment`, `Decision`) only when the foundation is genuinely the right place for that vocabulary across all expected consumers. Domain-specific names go in consumers, not the foundation.
- **No leaf-application assumptions in shape descriptions.** Descriptions explain the *abstract* role of each shape ("a Hypothesis is a claim under empirical test"), not what consumers will use it for. Concrete usage examples belong in consumer documentation.
- **Vocabulary that survives in absence.** If a consumer extends the foundation with their own shapes that bridge into the foundation's, the foundation's shape vocabulary should remain interpretable without those extensions. (Example: a research-arc foundation's `Hypothesis` makes sense whether or not a `Persona` shape is also in scope; the per-iteration meaning is intact.)

The canonical foundation-library exemplar in this catalog is **#6 Research-Arc Foundation**. The repos that consume it extend the foundation with leaf-specific shapes; the foundation itself never absorbed those leaf-specific concerns. That discipline is what made the foundation reusable.

For middleware (D9 = middleware: a graph that extends a foundation and is itself consumed downstream), the foundation rules apply *plus* the middleware carries the foundation's stability constraints downstream and adds its own conventions on top.

---

## When in Doubt

If a rule above seems to push you toward shapes that don't fit your domain, it is much more likely that:
1. You matched the wrong fingerprint in `pattern-catalog.md`. Re-check `dimensions.md`.
2. You're trying to apply a rule whose universal status is real but whose *example shape names* belong to a different fingerprint. Translate the names; keep the rule.

Almost no real WarmHub repo needs every shape from every entry in the catalog. Almost every WarmHub repo needs every rule in this file. Foundations are universal; vocabulary is fingerprint-specific.
