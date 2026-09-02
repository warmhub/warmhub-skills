# Portable repository checkpoints

Use this only as an explicit, authorized branch for an offline or reproducible
snapshot display, reconciliation/reseed/export, or evidence after an
outcome-unknown write. A checkpoint is an immutable portable archive of one
repository at its exact `repoSeq`; it is not an ordinary ingest, display, or
commit-retry step.

> **Generation is retired (export v3, #10020).** Nothing creates new
> checkpoints. Use `wh repo export` / `client.repo.export` for a fresh
> snapshot. Archives already stored stay readable through the read surfaces
> below until the announced cleanup.

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

Status is a durable record of work that already ran. On `complete`, request
fresh artifact access, download, and verify locally. `nextAction` still names
retired operations for terminal failures; it is historical wire vocabulary, so
take a repository export rather than trying to re-drive generation.
`repository_deleted` requires no action.

The TypeScript read plane is `client.repo.checkpoint`: `status`
(exactly one of `checkpointId` or `repoSeq`), `latest`, and `getAccess`.
`getAccess` selects `latest` or an exact checkpoint plus `archive`,
`manifest`, or a chunk path, and returns only a short-lived descriptor. Fetch
its signed URL without the WarmHub bearer token. Check the downloaded byte
length and SHA-256 against that descriptor, then stream the local archive
through `verifyRepositoryCheckpointArchive` from `@warmhub/sdk-ts/checkpoint`.

Python has the same namespace on both clients:
`await async_client.repo.checkpoint.status/latest/get_access`
and synchronous counterparts. On a repository handle, `get_access` selects
`checkpoint="latest"`, `checkpoint_id=`, or `repo_seq=` and an `artifact=`.
Verify local archive bytes with
`verify_repository_checkpoint_archive(..., expected=...)`; it makes no server
request.

The CLI equivalent is:

```text
wh repo checkpoint status org/repo --checkpoint ID
wh repo checkpoint download org/repo --checkpoint ID --archive --output checkpoint.zip
wh repo checkpoint verify checkpoint.zip
```

`download` streams and checks descriptor length and
SHA-256; `verify` is a separate local archive-content check. Request access
again if the descriptor expires rather than treating it as proof of download.

## Authority and recovery evidence

Status, latest, and artifact access require an authenticated non-component
principal with unrestricted `repo:read` and `repo:checkpoint-read` for the
repository. A narrowed or deny-all repository read matcher is not sufficient.

For outcome-unknown writes, preserve the request/submission identity,
acknowledged receipts, `lastAcknowledgedRepoSeq`, attempted operations, and
desired state. If the write can no longer apply, take and verify a later
repository export, recompute the plan from its rows, and issue a new
request/stream identity. Do not blindly replay the ambiguous append or infer an
offset from a snapshot.
