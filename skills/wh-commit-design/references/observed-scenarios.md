# Observed Envelopes And Generalized Scenarios

This file holds concrete examples and decision support; the workflow stays in `SKILL.md`.

The numbers below are grounded in observed commit-planning work, but the dataset names are intentionally generalized so the skill stays reusable.

## Proven General Guidance

- Prefer one semantic commit when the real semantic unit already fits.
- Partition only when it makes QC or a restart boundary clearer; do not use an operation-count target.
- For large multi-commit ingests:
  1. plan once
  2. split/export once
  3. retain each JSONL source digest with its stream/submission identity and exact receipts
  4. recover an ambiguous append by its event-request receipt, never a guessed offset

## Generalized Example Scenarios

### Scenarios That Fit As Single Semantic Commits

- Regional business registry
  - shape: `Business`
  - ops: `13,362`
  - recommendation: one semantic commit

- Household income survey responses for Region A
  - source rows: `18,264`
  - assertion pair pattern: raw record + normalized record
  - ops: `36,528`
  - recommendation: one semantic commit

- Household income survey responses for Region B
  - source rows: `16,262`
  - assertion pair pattern: raw record + normalized record
  - ops: `32,524`
  - recommendation: one semantic commit

- Survey amendment / correction set
  - mixed add+revise ops: about `310`
  - recommendation: one semantic commit

### Scenario That Needed Planning

- Statewide household registry
  - add-heavy dataset
  - about `9,073,597` ops
  - source file size: about `4 GB`
  - not appropriate for one commit

#### Proven Planning Rule

1. start with county
2. keep whole counties if they fit
3. split oversized counties by `county+zip5`
4. split oversized or blank-zip groups by `county+tract` or `county+block-group`
5. row-slice only as last resort

The original run used `151` source-derived groups. Those measurements are historical evidence,
not a reusable chunk-size target.

## Planning Heuristics

- First decide whether the dataset already has a semantic unit that fits.
- If it does, keep it intact.
- If not, look for a partition ladder:
  - geography
  - organization
  - time window
  - canonical entity key
- Use row-count slicing only when semantic keys stop helping.

## Operational Caveats

- Assertion exports must parameterize the canonical `about` org/repo. Do not hardcode benchmark wrefs if the data will be replayed elsewhere.
- Keep generated JSONLs and benchmark artifacts in scratch space, not tracked source trees.
- Record the immutable source location and digest, JSONL digest, `streamId`, `submissionId`, and
  each exact receipt. For an ambiguous append, look up its `eventRequestId`; retry only the
  identical request after opaque receipt-not-found.
