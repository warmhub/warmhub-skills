# Oracle Patterns

Use `Oracle/*` Things for sources that represent ground truth or authoritative adjudication. Oracles are not ordinary high-reputation sources.

## When To Use An Oracle

Use an oracle when:

- a deterministic verifier can settle the proposition;
- an official source publishes final outcomes;
- a human adjudication lane is the product's authoritative ground truth;
- a benchmark or test runner should train predictor reputation.

Do not use an oracle for:

- a normal model that is merely strong;
- a reviewer whose mistakes should be down-weighted over time;
- a feed that is convenient but not authoritative;
- a claim that has no true adjudication path.

## Topology

Prefer one oracle per question domain:

- `Oracle/test-runner/unit-suite`
- `Oracle/github/check-run`
- `Oracle/sports/final-score-feed`
- `Oracle/human-adjudication/security-review`

Avoid one global `Oracle/ground-truth` if it mixes unrelated domains. A global oracle makes ownership, failure handling, and audit trails too broad.

## Opinion Design

Put confidence in the oracle's `Certainty` opinion, not in oracle reputation.

Examples:

- Deterministic pass/fail result: high belief or high disbelief with low uncertainty.
- Human adjudication with ambiguity: belief/disbelief according to the decision, with enough uncertainty to reflect the adjudicator's confidence.
- Official feed later corrected: revise the oracle `Certainty` and add a repo-owned correction record.

## Bootstrap Loop

To make reputation learn quickly:

1. Pick early proposition assertions that ordinary sources can judge before truth arrives.
2. Have every ordinary source write `Certainty` on the same stable proposition assertion.
3. When truth arrives, write oracle `Certainty` on that same proposition assertion.
4. Let Veritas compare disagreement and update ordinary source reputation.

Do not write the outcome to a separate `Result` assertion and expect source reputation to learn.
The result must land as a `Certainty` opinion on the same proposition assertion that predictions
targeted.

## Oracle Hygiene

Oracle errors cannot be down-weighted by learned reputation. Assign an owner and define:

- how oracle inputs are validated;
- how corrections are revised;
- how consumers see corrected outcomes;
- whether an oracle can be disabled;
- how long to wait before treating missing oracle output as unresolved.
