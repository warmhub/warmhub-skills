# App Connection

## MCP-capable agents

For agent-native integration, connect the client to `POST ${WARMHUB_API_URL}/mcp` (production:
`https://api.warmhub.ai/mcp`). This is one global endpoint and one catalog: repository tools receive
`orgName` and `repoName` as arguments. Do not configure a repo-scoped MCP URL or catalog.

`initialize`, `tools/list`, and OAuth discovery work before authentication. Let standards-compliant
clients follow the RFC 9728 `WWW-Authenticate: Bearer resource_metadata=...` challenge from a
builder-tool `401` (or a `GET /mcp` probe) to protected-resource metadata and OAuth. Clients without
that flow may send a PAT as a Bearer token from their secret store; never place it in agent prompts,
logs, or committed client configuration as a raw value.

Anonymous calls can read public data. A missing, malformed, or unverified Bearer token falls back to
that anonymous tier, so listed builder tools may first return the authentication challenge. Do not
infer that a repo is public from an anonymous miss: private targets can look not-found and should
prompt authentication. Use `warmhub_capabilities` to orient the agent and `warmhub_repo_describe`
after it has the repo locator; do not hard-code the tool catalog. MCP supports ordinary repository
creation/content/metadata and some organization metadata, but not membership, role, or archive
administration; use the CLI or SDK for those absent operations.

For an MCP-only connection, stop after initialization, discovery, and the intended anonymous or
authenticated probe succeeds. Continue below only when the project also has a direct app read path.

## Direct app SDK baseline

Use the SDK native to the runtime: `warmhub` is a first-class option for Python services,
notebooks, and reports; `@warmhub/sdk-ts` is natural for TypeScript apps. Keep reads server-side
whenever credentials are needed.

1. Set `WARMHUB_REPO` to `org/repo` and, when needed, `WARMHUB_API_URL`.
2. Install `warmhub` (`pip install warmhub`) or `@warmhub/sdk-ts` (`bun add @warmhub/sdk-ts`).
3. Keep `WH_TOKEN` in a server/local secret store. Omit it only for a small anonymous public probe.
4. Fetch one stable fact (repo metadata, shapes, or one known thing) before adding a display or
   collector.

Use the installed SDK's current method names. Python's `WarmHubClient.from_env()` reads `WH_TOKEN`;
construct `WarmHubClient(...)` directly for intentional anonymous access. In TypeScript, provide an
`auth.getToken` callback only on the server.

## Ordinary reads

Use SDK iterators for scans (`head_iter` / `query_iter` in Python; `headIter` / `queryIter` in
TypeScript). Use the corresponding `*All` helper only when the result is bounded with its maximum
option. Do not hand-roll cursor loops for ordinary reads.

Anonymous public reads are intentionally small probes: at most 25 items per page and two pages.
Use authenticated `repo:read` access for complete datasets, private data, or any normal scan.

## Durable projection handoff

This skill stops after a one-fact connection probe. When that connection will back a long-lived
projection, follow
[read-patterns.md](../../build-warmhub-display/references/read-patterns.md) for incremental
eligibility, checkpoint persistence, replay, and reconciliation.

## Runtime Notes

- **Server apps:** keep `WH_TOKEN` in server environment variables. Never expose it through public
  runtime config or client bundles.
- **Cloudflare Workers:** store PATs with Worker secrets. Non-secret repo config can be Worker vars.
  If SDK compatibility is unclear, use a direct server-side HTTP probe for the first draft and record
  SDK validation as follow-up.
- **Static/report builds:** use build-time loaders for public-safe snapshots. Do not emit secrets or
  private raw data into generated files.
- **Notebooks:** keep PATs in environment variables or a local secrets manager, not notebook cells.
  Published notebooks must not depend on private secrets.

## Probe Evidence

Record:

- command, route, or notebook cell used for the probe;
- which repo and shape/fact was fetched;
- whether the probe used SDK or direct HTTP;
- exact error if auth, repo permissions, package install, or runtime compatibility blocks the probe.
