# Reputation Seeding

Seed reputation only when the design has a reason to start away from the default. Most sources should begin provisional and learn from outcomes.

## Defaults

Use `(0.5, 0, 0.5)` for ordinary sources unless there is prior evidence. It means moderate belief in reliability with substantial uncertainty.

The exact moderate seed is a design judgment, not a universal constant. Some domains use `(0.4, 0.1, 0.5)` when the source should start with weak prior distrust; keep the common shape of moderate belief plus high uncertainty and document why any distrust mass is present.

Use uncertainty mass to express weak priors:

- New source with plausible quality: `(0.5, 0, 0.5)`
- Previously strong source, limited comparable evidence: `(0.7, 0, 0.3)`
- Known noisy source that should still be learnable: `(0.35, 0.15, 0.5)`

Avoid `(1, 0, 0)` for ordinary sources. If a source must be unlearnable max trust, model it as an `Oracle/*` source.

## Discount Semantics

Under canonical discounting, distrust reduces a source's effect by moving mass toward uncertainty. It does not turn a bad source into positive evidence for the opposite claim.

Design implication: a distrusted source should be quiet, not inverted. If the domain needs "this source is reliably wrong, so believe the opposite," model that as a separate adversarial signal with explicit semantics rather than relying on reputation inversion.

## Scope Design

Reputation scope comes from the target shape and relation direction. If one source should learn separately for separate domains, model those domains as separate target assertion shapes.

Examples:

- `ClaimMatchOutcome` and `ClaimInjuryReport` should be separate shapes if a sports model may be reliable on outcomes but weak on injuries.
- `BuildFailureClaim` and `SecurityFindingClaim` should be separate shapes if a code reviewer has different track records across those domains.
- Directional pair claims should not share reputation unless their direction has the same meaning.

## Audit Checklist

Before launch:

- List expected sources.
- Decide whether each is ordinary or oracle.
- Write the initial BDU seed for each ordinary source.
- Explain why any source starts above default.
- Confirm each source will have repeated comparable targets.
- Confirm at least some targets will receive ground-truth or adjudication opinions.

After launch:

```bash
wh veritas --help
wh veritas list-reputations --help

wh veritas list-reputations --repo <org>/<repo>
wh veritas get-reputation --wref Agent/006 --scope MoleHypothesis --repo <org>/<repo>
```

If reputations never move, check whether outcomes are being written as `Certainty` on the same
proposition assertions as predictions.
