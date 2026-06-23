---
name: wh-commit-design
description: Design WarmHub commit plans for large or non-trivial ingests. Use when deciding chunking, semantic partitioning, commit sizing, resumable multi-commit workflows, or prod-like validation strategy for `wh commit create` runs. Trigger on requests about commit sizing, max ops, chunking, batching, JSONL ingest planning, large dataset ingestion, commit runbooks, or converting a real dataset into safe WarmHub commits.
---

# Wh Commit Design

Design the commit shape before generating or sending data.

Prefer semantic partitions and restartability over YOLO max-size commits.

## Workflow

1. Classify the dataset.
2. Decide whether it fits as one semantic commit.
3. If not, design a semantic partition ladder.
4. Define the execution model.
5. Define the validation path.

## 1. Classify The Dataset

Capture:

- op mix: `add` | `revise` | `assertion` | mixed
- estimated op count
- payload width / record size
- natural partition keys already present in the data
- target path:
  - local
  - proxied local / prod-like
  - prod

If the dataset is not already materialized as JSONL, decide whether it should be exported once or streamed.

## 2. Decide Single Commit Vs Planned Multi-Commit

Default rule:

- if a real semantic unit already fits comfortably, keep it as one commit
- if the semantic unit is too large, plan semantic sub-commits
- use blind row slicing only as the final fallback

Current practical guidance from observed runs:

- `13k`, `32k`, `36k` op scenarios fit naturally as single semantic commits
- `50k–100k` is the preferred planning band for larger add-heavy datasets when payloads allow
- do not design around unlimited ingest; current default hard ingest ceiling is `1,000,000` ops unless explicitly overridden

For multi-commit datasets, read [observed-scenarios.md](references/observed-scenarios.md).

## 3. Design A Semantic Partition Ladder

Use the narrowest ladder that preserves meaning and restartability.

Preferred order:

1. keep the natural semantic unit intact if it fits
2. split by a meaningful domain key already present in the dataset
3. split oversized groups by a finer domain key
4. row-slice only if the finer semantic key is still too large

Do not start with `chunkit N` unless the dataset has no useful partition keys.

## 4. Define The Execution Model

If the run is multi-commit:

1. plan semantic chunks once
2. split/export the source once
3. write JSONL files under a scratch path, not tracked source trees
4. commit repeatedly from those written files
5. persist resumable state

For large JSONL automation, avoid `wh commit create --json` if the wrapper would have to parse or buffer the full returned payload.

## 5. Define The Validation Path

Preferred sequence:

1. local smoke on 1-3 representative slices
2. proxied local / prod-like run on the same slices
3. full proxied local run if the scenario is large
4. only then replay against prod

For proxied local:

- keep the same JSONL inputs
- switch to the toxiproxy frontend path
- preserve repo/profile/api-url details in a runbook

## Output Shape

When asked to design a commit plan, produce:

- scenario summary
- recommended commit shape:
  - single semantic commit
  - or planned multi-commit
- partition ladder
- target chunk envelope
- execution model
- validation path
- concrete commands or script entrypoints if they already exist

## References

- Use [observed-scenarios.md](references/observed-scenarios.md) for the currently proven envelopes and generalized example datasets.

## Next steps

After the commit plan is approved, choose the next move:

- **Build ingestion** — `Use build-warmhub-repo to implement the commit plan in the repo pipeline.`
- **Run validation slices** — execute the planned local or prod-like smoke commands before full replay.
- **Revise ingestion plan** — `Use plan-warmhub-ingestion if partitioning changes source mapping or idempotency.`

End with:

```text
Next step:
- Recommended: <one next stage or action>
- Alternatives: <short list of valid next stages/actions>
- Manifest updated: <path or not updated>
- Ready for: <stage-name or human decision>
- Blocking questions: <none or concise list>
```
