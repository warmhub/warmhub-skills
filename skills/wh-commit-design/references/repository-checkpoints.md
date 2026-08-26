# Portable repository checkpoints

Use this only as an explicit, authorized branch for an offline or reproducible
snapshot display, reconciliation/reseed/export, or evidence after an
outcome-unknown write. A checkpoint is an immutable portable archive of one
repository at its exact `repoSeq`; it is not an ordinary ingest, display, or
commit-retry step.

## Choose the right recovery coordinate

- A portable archive checkpoint is a whole-repository snapshot for the cases
  above.
- A per-consumer incremental scan saves its own terminal `repoSeq` only after
  the scan is exhausted; continue that consumer with `sinceRepoSeq`. Do not
  substitute an archive checkpoint for that cursor.
- A write receipt/submission identity answers whether a submitted write
  applied. For ambiguous transport, stop the writer and look up the exact
  receipt before considering a retry. A checkpoint is later reconciliation
  evidence, never a way to guess a write offset or resume an ambiguous chunk.

## Lifecycle and access

`generate` is asynchronous and returns a durable status record. Request it
with `atLeastRepoSeq` only when the caller needs a checkpoint at or beyond an
acknowledged sequence; it is not an exact historical lookup. Poll queued or
running status by checkpoint ID with bounded backoff. On `complete`, request
fresh artifact access, download, and verify locally. Follow `nextAction` for
terminal failures: retry only `deadline_exceeded` or `attempts_exhausted` on
the same checkpoint ID; correct the source and generate again for
`invalid_source`; preserve the ID and escalate the support-directed failures;
`repository_deleted` requires no action.

The TypeScript control plane is `client.repo.checkpoint`: `generate`, `status`
(exactly one of `checkpointId` or `repoSeq`), `latest`, `getAccess`, and
`retry`. `getAccess` selects `latest` or an exact checkpoint plus `archive`,
`manifest`, or a chunk path, and returns only a short-lived descriptor. Fetch
its signed URL without the WarmHub bearer token. Check the downloaded byte
length and SHA-256 against that descriptor, then stream the local archive
through `verifyRepositoryCheckpointArchive` from `@warmhub/sdk-ts/checkpoint`.

Python has the same namespace on both clients:
`await async_client.repo.checkpoint.generate/status/latest/get_access/retry`
and synchronous counterparts. On a repository handle, `get_access` selects
`checkpoint="latest"`, `checkpoint_id=`, or `repo_seq=` and an `artifact=`.
Verify local archive bytes with
`verify_repository_checkpoint_archive(..., expected=...)`; it makes no server
request.

The CLI equivalent is:

```text
wh repo checkpoint generate org/repo --at-least-repo-seq N --wait
wh repo checkpoint status org/repo --checkpoint ID
wh repo checkpoint download org/repo --checkpoint ID --archive --output checkpoint.zip
wh repo checkpoint verify checkpoint.zip
```

`--wait` only polls. `download` streams and checks descriptor length and
SHA-256; `verify` is a separate local archive-content check. Request access
again if the descriptor expires rather than treating it as proof of download.

## Authority and recovery evidence

Status, latest, and artifact access require an authenticated non-component
principal with unrestricted `repo:read` and `repo:checkpoint-read` for the
repository. Generation and retry additionally require `repo:checkpoint-generate`;
existing `repo:admin` authority also permits those two operations, but does not
replace checkpoint-read. A narrowed or deny-all repository read matcher is not
sufficient.

For outcome-unknown writes, preserve the request/submission identity,
acknowledged receipts, `lastAcknowledgedRepoSeq`, attempted operations, and
desired state. If the write can no longer apply, generate and verify a later
checkpoint, recompute the plan from its rows, and issue a new request/stream
identity. Do not blindly replay the ambiguous append or infer an offset from a
checkpoint.
