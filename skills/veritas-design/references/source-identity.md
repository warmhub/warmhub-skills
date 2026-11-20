# Source Identity

Veritas reputation attaches to the `source` wref on `Certainty`, `Support`, and `Opposition`. Source identity is therefore a modeling decision, not metadata.

## Decision Rule

Use one source Thing for one independent judgment process.

| Candidate source | Use when | Avoid when |
| --- | --- | --- |
| Per human | Humans make independent judgments and keep stable identities across sessions. | The human only approves another system's output without independent review. |
| Per agent | One agent role uses one stable prompt, tool path, and decision policy. | The same agent name covers unrelated tasks. |
| Per agent version | Prompt, model, or tool changes are expected to affect accuracy and should learn separately. | Versions are cosmetic or too frequent to accumulate reputation. |
| Per pipeline stage | Stages judge different propositions, such as parser validity vs factual correctness. | Stages are just implementation details of one judgment. |
| Per organization/team | The team is the accountable reviewer and individual identity is unavailable. | Individual reviewer track records matter. |
| Per run | Rarely correct. Only use if the run itself is a durable actor with repeated judgments. | Normal batch jobs or predictions. |

## Stable Names

Prefer names that encode durable identity:

- `agents/reviewer/gpt-5/verdict-v2`
- `pipelines/triage/classifier-v3`
- `humans/alice`
- `oracles/test-runner/unit-suite`

The prefix names the kind of source. It does not set the Shape: each source Thing declares its
Shape in `shapes`. Veritas treats a source as an oracle when its certified Shapes include
`Oracle`: the source declares `Oracle` or a Shape that composes it.

Avoid names that encode ephemeral execution:

- `agents/reviewer/run-2026-06-15`
- `agents/model-a-temperature-0-2-at-13-45`
- `agents/all-ai`

Run and configuration details belong on repo-owned provenance records, not source identity, unless they define a meaningfully different judgment process that should learn separately.

## Split Or Merge

Split a source identity when:

- it judges a different proposition type;
- its prompt, model, policy, or input surface changes enough to affect reliability;
- it combines independent roles that should build separate track records;
- consumers need to audit one lane without contaminating another.

Merge source identity when:

- the process is intentionally one stable accountable actor;
- version changes are minor and should not reset reputation;
- there will not be enough repeated judgments per split to learn anything useful.

## Mixed Identity Failure

Do not reuse one source for a strong pipeline and a weak pipeline. Veritas will learn one blended reputation, so the strong lane is underweighted and the weak lane is overweighted.

If a single product feature contains several judgment processes, model them separately:

- `pipelines/review/static-analysis`
- `pipelines/review/llm-summary`
- `pipelines/review/human-adjudication`

Then let downstream display group them if needed.
