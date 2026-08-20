---
name: veritas-design
description: >
  Design how a WarmHub repo uses the Veritas component, including whether Veritas is the right fit,
  which binary propositions get Certainty opinions, which agents or systems assert as which source
  Things, how to seed reputations and scopes, when to model Oracle ground-truth sources, and how to
  consume Consensus. Use when installing Veritas in a repo, when multiple sources will express
  belief-disbelief-uncertainty opinions about the same binary propositions, when deciding between a confidence
  field, hand-rolled BDU, or Veritas, when assigning or auditing source reputations, or when wiring a
  test-runner, adjudicator, verifier, or human review lane as an oracle. Trigger phrases: "design our
  certainties", "who should assert", "initial reputation", "Veritas oracle", "trust-weighted
  consensus", "Certainty sources", "Consensus output".
---

# Veritas Design

## Objective

Design a WarmHub repo so Veritas computes real reputation-weighted consensus instead of echoing a single source's opinion.

Veritas is a component, not a library call. Design the repo around its fixed shapes, source identity model, reputation learning behavior, and derived `Consensus` output.

## Use Veritas Only When It Earns Its Keep

Choose the smallest uncertainty model that fits:

| Need | Use | Do not use |
| --- | --- | --- |
| One writer records a point estimate | `confidence: number` | Veritas |
| One writer records a BDU opinion for later human review | Repo-owned BDU fields | Veritas |
| Multiple independent sources assert BDU opinions about the same binary propositions, and disagreement should teach source reputation | Veritas | Hand-rolled trust weighting |

Veritas is a fit only when all are true:

- Propositions are binary: true or false.
- Two or more independent sources can write opinions about the same target.
- Disagreement is expected and informative.
- Ground truth or later adjudication can eventually train reputation, or the project accepts manually seeded reputation as provisional.
- Consumers need belief, disbelief, uncertainty, and source trust separated, not one flattened score.

Do not use Veritas for magnitudes, categories, ranked choices, continuous relevance strength, one-source prediction feeds, or dashboard confidence badges with no independent disagreement.

## Workflow

1. Decide fit using the fork above. If the repo only needs point estimates, route back to repo design and use confidence fields.
2. Design the proposition layer before sources. Each target must be one stable binary proposition
   assertion, named by identity rather than run, snapshot, or timestamp.
3. Design source identity. Use one source Thing per independent judgment process, not one shared source for unrelated pipelines.
4. Plan reputation seeding and scope. Keep seeds uncertain unless a source is an oracle.
5. Design oracle topology if ground truth exists or can be adjudicated.
6. Define write operations: add or revise `Certainty`, never re-add duplicates from the same source on the same target.
7. Define read behavior: consume latest `Consensus` as derived state and display the BDU triple.
8. Define provenance outside component shapes. Put evidence IDs, frozen probabilities, run IDs, model versions, and rationale on repo-owned record shapes.

## Component Contract

Veritas installs fixed component shapes:

| Shape | Kind | Role |
| --- | --- | --- |
| `Certainty` | assertion | A source's BDU opinion about a binomial proposition. `source` is required. |
| `Support` | assertion | Opinion that one assertion supports another. New writes use a directional Arc; legacy Pair remains compatible. |
| `Opposition` | assertion | Opinion that one assertion opposes another. New writes use a directional Arc; legacy Pair remains compatible. |
| `Consensus` | assertion | Veritas-written derived BDU output. No `source` or `rationale`. |
| `Oracle` | thing | Ground-truth source identity with fixed max trust. |

Do not extend component shapes. If the app needs evidence wrefs, model version, raw probability, frozen source output, or audit metadata, create a repo-owned shape such as `PredictionRecord`, `ReviewRecord`, or `AdjudicationRecord`.

## Proposition Layer

The `about` target of `Certainty` must be an assertion wref that semantically denotes one stable
binary proposition. It must not be a Thing wref. The base proposition assertion points at the domain
thing or relationship being judged; `Certainty` carries each source's belief, disbelief, and
uncertainty about that proposition assertion.

Good proposition design:

- `MatchHomeWin/match-123` — assertion about `Match/match-123`
- `PullRequestRegression/pr-456` — assertion about `PullRequest/pr-456`
- `IncidentRootCause/case-789/cache-invalidation` — assertion about `Incident/case-789`

Bad proposition design:

- `Match/match-123` — a Thing target, not a proposition assertion
- `Claim/pr-456/regression-present` — ambiguous or wrong when `Claim` is modeled as a Thing
- `PullRequestRegression/run-2026-06-15/pr-456` — run-keyed proposition identity
- `PullRequestRegression/pr-456/model-a-prediction` — source-keyed proposition identity
- `PullRequestRegression/pr-456/confidence-0.82` — probability encoded in the target name

Rules:

- Model a repo-owned proposition assertion shape for each question family.
- Name the proposition assertion by what is being judged, not who judged it or when.
- Keep one binary outcome per target assertion. Split multi-class questions into separate binary propositions when needed.
- Keep snapshot, run, evidence, and model data on repo-owned record shapes.
- If the proposition assertion name changes on every run, opinions will not meet, and Veritas will
  only return each source's opinion back to itself.

## Source Identity

Read [references/source-identity.md](references/source-identity.md) when choosing source granularity.

Use one source Thing per independent judgment process. Reputation attaches to the `source` wref, so a mixed identity learns a blended reputation that is hard to interpret.

Good source identities:

- `Agent/reviewer/gpt-5/verdict-v2`
- `Pipeline/static-analyzer/biome-rules`
- `Human/alice`
- `Oracle/test-runner/unit-suite`

Avoid:

- One `Agent/codex` source for unrelated review, prediction, summarization, and adjudication workflows.
- Per-run source names that never accumulate track record.
- Reusing one source wref after the underlying process changes meaningfully.

## Reputation And Scope

Read [references/reputation-seeding.md](references/reputation-seeding.md) before seeding trust.

Design defaults:

- Treat `(0.5, 0, 0.5)` as provisional moderate trust.
- Treat exact seed values as a domain judgment within "moderate belief, high uncertainty"; `(0.4, 0.1, 0.5)` is also reasonable when weak prior distrust is intentional.
- Seed with uncertainty mass when you have weak prior evidence.
- Use oracles for unlearnable max-trust ground truth, not ordinary sources.
- Distrust silences a source under canonical discounting; it does not invert the source into positive evidence for the opposite proposition.
- Reputation scopes derive from target shape and relation direction. If two domains need separate reputation, model them with separate target shapes.

Operational audit commands may include. Reputation is scoped, so use the target-shape scope explicitly:

```bash
wh veritas --help
wh veritas list-reputations --help
wh veritas get-reputation --help
wh veritas upsert-reputation --help

wh veritas list-reputations --repo <org>/<repo>
wh veritas get-reputation --wref Agent/006 --scope MoleHypothesis --repo <org>/<repo>
wh veritas upsert-reputation --wref Agent/006 --scope MoleHypothesis --belief 0.7 --disbelief 0.1 --uncertainty 0.2 --repo <org>/<repo>
```

## Oracle Topology

Read [references/oracle-patterns.md](references/oracle-patterns.md) when ground truth, adjudication, or verification is available.

Use `Oracle/*` sources for ground truth that should not be reputation-discounted:

- deterministic test runner
- benchmark adjudicator
- official outcome feed
- human adjudication lane with clear ownership

Oracle rules:

- One oracle per question domain.
- Put oracle confidence in the `Certainty` opinion, not in oracle reputation.
- Write oracle `Certainty` onto the same proposition assertions that predictions used.
- Assign an owner for oracle hygiene. Oracle mistakes cannot be down-weighted by learned reputation.
- Use oracle-settleable proposition assertions early to bootstrap ordinary source reputations.

## Consensus Consumption

Treat `Consensus` as derived state.

- Read it from the target proposition assertion when needed.
- Never copy it into durable repo-owned fields as canonical truth.
- Show belief, disbelief, and uncertainty. A single expectation percentage hides what Veritas computes.
- Label certainty from uncertainty, not from expectation alone.
- Expect latency. Veritas is webhook-driven and may solve after the write commit. Poll with a timeout or read latest consensus on the next cycle.

Current design limitations to account for:

- Arc-level `Support` and `Opposition` consensus is diagnostic unless the deployed worker explicitly
  propagates it to consequent propositions.
- `Bond` is not a valid `Support` or `Opposition` target because Veritas inference is directional.
- Retraction of all inputs may produce vacuous consensus `(0, 0, 1)`.
- Same-source duplicate `Certainty` on one target can block consensus. Revise instead.

## Write Loop

Use this shape of workflow, adapting names to the repo:

```text
Install Veritas once.
Ensure source Things exist: Agent/model-a, Agent/model-b, Oracle/ground-truth.

For each stable binary proposition:
  ensure PullRequestRegression/pr-456 exists as an assertion about PullRequest/pr-456
  for each source opinion:
    add or revise Certainty/<proposition>/<source> about PullRequestRegression/pr-456
    add repo-owned PredictionRecord/<run>/<proposition>/<source> with evidence and frozen output

When ground truth arrives:
  add or revise Certainty/<proposition>/ground-truth about the same proposition assertion
  source = Oracle/ground-truth

Read Consensus about the proposition assertion and render BDU.
```

## Anti-Checklist

If any item is true, the design is probably an echo rather than consensus:

- Proposition assertions are named by run, snapshot, timestamp, or model.
- Only one source ever writes `Certainty` on a target.
- `alpha` equals the source's predicted probability.
- Each cycle re-adds source opinions instead of revising them.
- Outcomes are recorded somewhere other than `Certainty` on the same proposition assertion.
- Reputations never appear or never move.
- The UI shows one percentage and hides uncertainty.

## Reference Index

- [references/source-identity.md](references/source-identity.md) - choose source granularity.
- [references/reputation-seeding.md](references/reputation-seeding.md) - seed and audit reputation.
- [references/oracle-patterns.md](references/oracle-patterns.md) - model ground-truth sources.
- [references/worked-example.md](references/worked-example.md) - end-to-end claim-review design.
- [../modeling-foundations/references/primitives.md](../modeling-foundations/references/primitives.md) - BDU and the binomial-opinion constraint.

## Next steps

After Veritas design is complete, choose the next concrete move:

- **Install component** - use `wh component install warmhub/veritas --repo <org>/<repo>` after the repo model is approved.
- **Plan ingestion** - define the write loop that creates and revises `Certainty` plus repo-owned provenance records.
- **Build display** - render BDU and explain source/oracle status without flattening uncertainty.
- **Revise repo model** - if propositions are not binary or sources are not independent, rerun `design-warmhub-repo`.
