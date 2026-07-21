# Observed Envelopes And Generalized Scenarios

Use this file for concrete examples and decision support. Keep `SKILL.md` lean.

The numbers below are grounded in observed commit-planning work, but the dataset names are intentionally generalized so the skill stays reusable.

## Proven General Guidance

- Prefer one semantic commit when the real semantic unit already fits.
- For larger add-heavy datasets, target roughly `50k–100k` ops per planned chunk when payloads allow.
- Prefer semantic partition keys over blind fixed-size row chunking.
- For large multi-commit ingests:
  1. plan once
  2. split/export once
  3. commit repeatedly from written JSONLs
  4. resume from a state file

## WarmHub Constraints

- Current default hard ingest ceiling: `1,000,000` ops unless explicitly overridden by env.
- Treat unlimited mode as exceptional, not the planning baseline.

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

#### Observed Partition Stats

- county
  - too coarse for metros
  - `24` counties exceed `100k`
  - largest counties near `1M`

- zip5
  - workable, but skewed
  - p95 `35,184`
  - p99 `50,880`
  - `10` ZIP buckets exceed `50k`
  - blank ZIP bucket is pathological: `1,169,562`

- county+zip5
  - best first-cut semantic splitter
  - p95 `29,759`
  - p99 `44,213`
  - only `11` buckets exceed `50k`
  - only `2` exceed `100k`

- county+tract or county+block-group
  - good secondary splitters
  - p95 `~7k`
  - p99 `~15k`

#### Proven Planning Rule

1. start with county
2. keep whole counties if they fit
3. split oversized counties by `county+zip5`
4. split oversized or blank-zip groups by `county+tract` or `county+block-group`
5. row-slice only as last resort

#### Planner Proof

- planned chunk groups: `151`
- p50 group size: `57,688`
- p95 group size: `99,980`
- max: `100,000`
- `76` direct county groups
- `75` split groups
- `4` row-slice segments

#### Proxied Local Proof Samples

- small rural chunk
  - `2,736` ops
  - `3.031s`
- medium county slice
  - `9,537` ops
  - `7.734s`
- metro chunk
  - `99,795` ops
  - `69.155s`

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
- For large JSONL automation, wrappers around `wh commit submit` should avoid `--json` if they cannot safely handle very large returned payloads.
- Keep generated JSONLs and benchmark artifacts in scratch space, not tracked source trees.
