# WarmHub Display Read Patterns

Choose the narrowest read pattern that answers the display. Keep simple one-shot and static builds
simple; they do not need a projection or saved consumer `repoSeq`.

## SDK And Access Choice

- TypeScript SDK is the natural choice for TypeScript apps, Workers, and Observable loaders.
- Python SDK is a first-class choice for IPython notebooks, report jobs, and Python services.
- Tokenless anonymous public reads are for a small public display or connection probe only: at most
  25 rows per page and two pages. Do not use them to claim a complete dataset.
- Use authenticated reads for complete datasets. For ordinary pagination, use the SDK's iterator or
  `all` helper rather than hand-rolling cursors.

For a repeatable, least-privilege display subset, optionally define a stored View and use a
View-backed grant for the display credential. A stored View is not required for a one-off query or
static snapshot, and a View-backed grant cannot drive incremental reads because those require
unrestricted repository read authority.

## Long-Lived Projections Only

Use incremental reads only when a durable display projection has a real refresh need. Bootstrap with
`headChanges` or `queryChanges` and `sinceRepoSeq: -1`; apply changes idempotently. Keep the prior
consumer `repoSeq` while the scan is in progress or fails, and persist the terminal `repoSeq` only
after the scan is exhausted successfully.

Both helpers require unrestricted repository read authority. Use `queryChanges` only when its
server-side query is accepted and clearly matches the projection. It rejects glob `match`,
`resolveCollections`, cross-repo `about`, and `affirmedAbout`. When incremental reads are
unavailable, retain the prior projection and retry after enablement or simplify the query; do not
downgrade to a full read.

After a successful bootstrap, resume from the saved `repoSeq`. A partial scan may be replayed from
the old `repoSeq`, so projection writes must tolerate replay. Because the helpers report
identity-owned changes rather than every dependency or writer effect, periodically reconcile any
complete local copy against a full read.
