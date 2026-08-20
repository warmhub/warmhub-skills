# Worked Example: Claim Review With Veritas

This example designs a code-review repo where several sources judge whether a pull request introduced a regression.

## Proposition Layer

Create the durable subject Thing and one stable proposition assertion per pull request:

```text
PullRequest/pr-123
PullRequestRegression/pr-123
about = PullRequest/pr-123
```

`PullRequestRegression/pr-123` is the proposition assertion. It means: "PR 123 introduced a
regression." It does not name the model, run, or current probability.

`Certainty` targets `PullRequestRegression/pr-123`, not `PullRequest/pr-123`. Targeting the Thing
would only say "some opinion about this pull request" and would not identify the binary proposition
being judged.

## Sources

Ordinary sources:

```text
Agent/reviewer/static-analysis
Agent/reviewer/llm-review-v2
Human/reviewer/alice
```

Oracle source:

```text
Oracle/test-runner/regression-suite
```

The static analyzer and LLM review are separate because they use different judgment processes. Alice is separate because human review should learn its own track record.

## Certainty Opinions

Each ordinary source writes one active `Certainty` about the same proposition assertion:

```text
Certainty/pr-123/regression/static-analysis
Certainty/pr-123/regression/llm-review-v2
Certainty/pr-123/regression/alice
```

All have:

```text
about = PullRequestRegression/pr-123
source = Agent/... or Human/...
data = belief, disbelief, uncertainty, alpha, rationale
```

If a source re-runs, revise its existing `Certainty`. Do not add another active `Certainty` from the same source on the same target.

## Provenance Record

Add a repo-owned record for audit data:

```text
ReviewRecord/run-2026-06-15/pr-123/llm-review-v2
```

Fields can include:

- proposition assertion wref
- source wref
- model and prompt version
- raw probability
- frozen BDU
- evidence wrefs
- commit SHA
- reviewer notes

This data does not belong on `Certainty` if the component shape does not define those fields.

## Oracle Settlement

When the regression suite finishes, it writes:

```text
Certainty/pr-123/regression/regression-suite
about = PullRequestRegression/pr-123
source = Oracle/test-runner/regression-suite
```

If the suite passes and the proposition is false, use high disbelief and low uncertainty. If the
suite result is flaky, keep more uncertainty in the oracle opinion.

## Consensus Display

Consumers read `Consensus` about `PullRequestRegression/pr-123` and show:

- belief
- disbelief
- uncertainty
- expectation if useful
- source count
- oracle settled/unsettled status

Do not display only "82% likely regression." That hides whether the number is strong agreement, one source echoed back, or high uncertainty shrunk toward the base rate.

## Failure Checks

This design fails if:

- `Certainty` targets `PullRequest/pr-123` or another Thing instead of the proposition assertion;
- `PullRequestRegression/pr-123` is recreated per run;
- only one source writes opinions;
- the oracle writes a separate `TestResult` but no on-target `Certainty`;
- `alpha` is copied from each source's predicted probability;
- each re-run adds a new source opinion rather than revising.
