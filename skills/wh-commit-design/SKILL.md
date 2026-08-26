---
name: wh-commit-design
description: Design WarmHub commit plans for large or non-trivial ingests. Use when deciding chunking, semantic partitioning, commit sizing, resumable multi-commit workflows, or prod-like validation strategy for `wh commit submit` runs. Trigger on requests about commit sizing, max ops, chunking, batching, JSONL ingest planning, large dataset ingestion, commit runbooks, or converting a real dataset into safe WarmHub commits.
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
- immutable source location and content digest
- natural partition keys already present in the data
- target path:
  - local
  - proxied local / prod-like
  - prod

If restartability matters, export the source once as JSONL and retain its digest. Use stdin only when
the producer itself is the immutable, replayable source.

## 2. Decide Single Commit Vs Planned Multi-Commit

Default rule:

- if a real semantic unit already fits comfortably, keep it as one commit
- if it is too large for one bounded request, emit replayable JSONL and let the CLI group it
- use blind row slicing only as the final fallback

Do not choose source partitions from a generic operation-count target. Add a semantic boundary only
when it improves QC, human review, or replay/restart clarity; transport grouping is the CLI's job.

For multi-commit datasets, read [observed-scenarios.md](references/observed-scenarios.md).

## 3. Design A Semantic Partition Ladder

Use the narrowest ladder that preserves meaning and restartability.

Preferred order:

1. keep the natural semantic unit intact if it fits
2. split by a meaningful domain key already present in the dataset
3. split oversized groups by a finer domain key
4. row-slice only if the finer semantic key is still too large

Do not start with blind row slicing (for example, a fixed `--chunk-size N` plan) unless the dataset
has no useful partition keys.

## 4. Define The Execution Model

For a large run:

1. export one replayable JSONL per meaningful source partition under a scratch path
2. submit it with `wh commit submit --repo <org>/<repo> --file <source>.jsonl --stream-id <stable-source-stream> --skip-existing -m "…"`; the CLI creates the transport groups
3. use `--stream` with the same required `--stream-id` and `--skip-existing` only when an immutable producer is the source
4. persist the source location and digest, JSONL digest, stream id, submission id, and every returned receipt

Pass `--submission-id <uuid>` when the runbook owns recovery identity; otherwise record the UUID
the CLI prints. `streamId` is correlation metadata, while the submission id plus chunk ordinal
derives the receipt lookup identity.

For an ambiguous append, stop the affected write and run `wh commit receipt <event-request-id> --repo <org/repo>`.
A returned receipt is authoritative. Retry only after an opaque not-found response, and then resend
the identical submission identity, stream id, message, and ordered operations. `--skip-existing`
makes deliberate add-only reruns safe; it does not establish that an ambiguous append failed.

Do not add checkpoints to normal retries. Only when reconciliation, reseeding, export, or
outcome-unknown recovery evidence needs a portable repository archive, follow
[repository-checkpoints.md](references/repository-checkpoints.md). It keeps the archive lifecycle,
authority, integrity check, and separation from per-consumer incremental `repoSeq` and exact write
receipts explicit.

## 5. Define The Validation Path

Preferred sequence:

1. run `wh commit submit --dry-run` on one complete bounded representative input
2. correct server-reported errors, then write one independently reviewable JSONL group
3. inspect its exact receipt and only then continue the remaining groups

Dry-run uses the real server evaluator, but it is bounded to 10,000 operations and 4 MiB encoded
input. It neither reserves repository state nor creates a submission identity or receipt, so the
real write still needs normal receipt-based recovery.

## Output Shape

When asked to design a commit plan, produce:

- scenario summary
- recommended commit shape:
  - single semantic commit
  - or planned multi-commit
- partition ladder
- source/group identity and retained evidence
- execution model
- validation path
- concrete commands or script entrypoints if they already exist

## References

- Use [observed-scenarios.md](references/observed-scenarios.md) for the currently proven envelopes and generalized example datasets.
- Use [repository-checkpoints.md](references/repository-checkpoints.md) only for the optional
  portable archive branch; it is not a commit-retry mechanism.

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
