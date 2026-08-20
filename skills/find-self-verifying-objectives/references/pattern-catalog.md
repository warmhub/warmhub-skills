# Pattern Catalog

Use this file to generate and attack candidate no-ground-truth metrics.

## Metric Families

| Family | Ask | Generic form | Strong when | Common loophole |
| --- | --- | --- | --- | --- |
| Reconstruction or forward-model residual | Can the candidate explanation reproduce the measurements? | `d(y, y_hat(z))` | The system has a simulator, measurement model, decoder, or parser | The model overfits the residual while still being wrong in the task-relevant way |
| Redundant agreement | Can the same quantity be inferred in two independent ways? | `d(g1(D), g2(D))` | Multiple sensors, multiple parsers, double-entry accounting, or independent estimators exist | Both paths share the same bias or failure mode |
| Cycle or metamorphic relation | Should known transforms preserve the answer or change it predictably? | `d(F(T_in(x)), T_out(F(x)))` | Inputs admit symmetries, round-trips, format conversions, or reversible transforms | The transform is too weak, so bad outputs still pass |
| Constraint or invariant violation | What must always hold? | `||c(z, D)||` or `max(0, g(z, D))` | Conservation laws, budgets, legal rules, monotonicity, and schema constraints exist | The constraint is real but only weakly tied to the desired behavior |
| Predictive adequacy | Can the model predict masked, future, or delayed observations? | log score, CRPS, calibration, held-out error | Some consequences become visible later without manual labels | The forecast is well calibrated but not useful for the decision |
| Optimality or feasibility residual | Does the candidate satisfy its own solver conditions? | primal residual, dual residual, KKT residual, duality gap | The task is an optimization or control problem with explicit constraints | The solver is internally consistent around the wrong objective |
| Stability or sensitivity | Do benign perturbations change the answer too much? | `d(z_hat(D), z_hat(T(D))) / ||D - T(D)||` | Small noise, dropout, timing jitter, or threshold changes should not matter | The metric rewards rigidity when the task actually requires adaptation |

## Adjacent-Subproblem Moves

- Replace end-to-end success with explanation of observables.
- Replace correctness with agreement between independent paths.
- Replace immediate reward with prediction of a later observable.
- Replace action quality with veto quality, abstention quality, or anomaly detection.
- Replace full-task optimization with diagnosis of when the current model is outside its envelope.
- Replace one scalar score with a bundle that mixes fit, consistency, and sensitivity.
- Add redundancy or instrumentation when no internal check exists yet.

## Attack Checklist

Reject or downgrade a candidate when:
- a trivial strategy can win
- nuisance factors dominate the score
- the score improves after the real failure is already obvious
- no operational action changes when the score moves
- the score is too expensive or unstable to monitor continuously
- the score is just a renamed copy of another metric in the bundle

## Short Examples

- Robotics or SLAM: reprojection residual, innovation whiteness, loop-induced deformation, ICP fitness, Hessian degeneracy.
- Data ingestion or QC: row-count reconciliation, source-total vs parsed-total agreement, schema and range violations, duplicate-rate drift.
- Forecasting or planning: calibration, log score, interval coverage, scenario feasibility.
- Search or ranking: counterfactual consistency checks, delayed-outcome prediction, abstention and triage quality.
