---
name: find-self-verifying-objectives
description: >
  Find adjacent, simpler optimization targets that can be measured from collected data without
  external ground truth. Use when designing a WarmHub repo, robotic system, forecasting loop, or
  any iterative system and asking "what can we optimize without labels?", "what internal metrics or
  invariants exist?", "how do we turn this into a self-healing loop?", or "what smaller problem is
  actually tractable?" Trigger phrases: "discover self-verifying objectives", "find an adjacent
  simpler problem", "find invariant metrics", "no-ground-truth optimization", "partial oracle",
  "internal evaluation metric".
---

<objective>

Turn a hard objective that needs external truth into a bundle of formal, operational metrics that
can be computed from the system's own data. Prefer self-verifying objectives over vague proxies.
When a true no-ground-truth objective is unavailable, say so clearly and recommend what extra
instrumentation, redundancy, or delayed labels are required.

</objective>

<quick_start>

1. Name the hard goal and the decision the system must make.
2. List observables, latent state, controls, and available interventions.
3. Search the pattern catalog in [references/pattern-catalog.md](references/pattern-catalog.md).
4. Propose 3-7 candidate self-verifying objectives and 1-3 adjacent subproblems.
5. Stress-test each candidate for degeneracy, alignment, and actionability.
6. Return a metric bundle, not a single scalar.

</quick_start>

<workflow>

## Step 1: Frame the problem around decisions and data

Ask for or infer:
- the real business or robotic objective
- the specific decision or action the system controls
- the data collected during or after each run
- the interventions the system can take when a metric worsens
- the failure modes that matter most
- whether any outcomes become visible later, even if not immediately

Prefer concrete statements such as:
- "choose whether to accept a loop closure"
- "rank leads for follow-up"
- "decide whether a QC report is safe to publish"

Avoid optimizing a mission statement directly.

## Step 2: Test whether a self-verifying objective exists

A strong no-ground-truth metric usually exists when at least one of these is true:
- a candidate solution implies measurable consequences on observables
- the same quantity can be inferred in two independent ways
- known constraints or invariants must always hold
- benign transforms should preserve the answer or change it predictably
- future, masked, or delayed observations can validate current predictions
- the solver or controller exposes feasibility or optimality residuals
- small nuisance perturbations should not materially change the output

If none hold, say there is no honest self-verifying objective yet. Recommend adding
instrumentation, redundancy, delayed labels, or a narrower problem.

## Step 3: Search for adjacent tractable subproblems

Use one or more of these moves:
- move closer to raw observables: optimize explanation of measurements before optimizing the end goal
- move from absolute correctness to agreement: compare two views, sensors, models, or accounting paths
- move from outcome to forecast: predict something that will become observable later
- move from action quality to veto quality: optimize abstention, safety gates, triage, or anomaly detection
- move from full control to diagnosis: optimize detection of when the current model is untrustworthy
- move from one-shot success to stability: optimize robustness under benign perturbations
- move from global performance to local certificates: optimize feasibility, consistency, or conservation at each step

Prefer the smallest subproblem that creates a trustworthy loop.

## Step 4: Generate candidates across families

Use the catalog in [references/pattern-catalog.md](references/pattern-catalog.md). Always check at
least:
- reconstruction or forward-model residual
- redundant agreement
- cycle or metamorphic relation
- constraint or invariant violation
- predictive adequacy
- optimality or feasibility residual
- stability or sensitivity

Do not stop at the first plausible metric. A single internal metric is easy to game.

## Step 5: Attack the loopholes

For each candidate, ask:
- can a trivial or degenerate solution score well?
- can nuisance factors dominate the score?
- does improvement in the score change a real decision?
- does the metric fail before or after the real system fails?
- is the metric cheap and stable enough to run continuously?
- does it duplicate another metric instead of adding independent evidence?

Reject candidates that do not survive this attack.

## Step 6: Classify the surviving metrics

Assign each metric one role:
- inner-loop objective: safe to optimize directly
- outer-loop critic: monitor, compare runs, or trigger retuning
- safety gate: block actions or request human review
- instrumentation gap: useful idea, but not computable with current data

Prefer a bundle with one metric from different families instead of many near-duplicates.

## Step 7: Map the result to WarmHub when relevant

For WarmHub repos:
- represent raw run data, intermediate diagnostics, and final assessments as separate shapes
- store per-run metric values, thresholds, and failure reasons explicitly
- emit assessment assertions for gate decisions and degraded-confidence states
- keep the optimization loop tied to formal residuals, not free-form LLM judgments
- use the LLM as a generator of candidates, loopholes, interventions, or summaries, not as the primary scorer

</workflow>

<output_contract>

Return:
- **Hard goal** — the original objective in one sentence
- **Operational loop** — what is observed, decided, and acted on each run
- **Candidate self-verifying objectives** — table with: name, family, formula or rule, required
  data, why no external ground truth is needed, loopholes, interventions, and loop role
- **Adjacent subproblems** — 1-3 narrower problems that are easier to optimize honestly
- **Recommended metric bundle** — the minimal bundle to start with
- **WarmHub implementation sketch** — shapes, assertions, QC checks, and cron or review hooks if
  the user is building a repo
- **Missing instrumentation** — anything that prevents a trustworthy loop today

If no viable self-verifying objective exists, say that directly and explain what extra measurements
or delayed outcomes would make one possible.

## Next steps

After the metric bundle is chosen, pick the next move:

- **Design WarmHub shapes** — `Use design-warmhub-repo to model the run data, diagnostics, and assessments.`
- **Plan instrumentation** — add the missing measurements before choosing optimization targets.
- **Build QC automation** — `Use add-warmhub-component if the metrics should run as recurring checks.`

End with:

```text
Next step:
- Recommended: <one next stage or action>
- Alternatives: <short list of valid next stages/actions>
- Manifest updated: <path or not updated>
- Ready for: <stage-name or human decision>
- Blocking questions: <none or concise list>
```

</output_contract>

<success_criteria>

A good result:
- identifies at least one objective tied to the system's own observables
- distinguishes true self-verifying objectives from loose proxies
- names the loopholes and degenerate solutions up front
- recommends a bundle of partially independent metrics
- explains what action each metric enables
- states clearly when the current problem is not yet instrumented enough

</success_criteria>
