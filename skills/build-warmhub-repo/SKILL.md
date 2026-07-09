---
name: build-warmhub-repo
description: >
  Build a complete WarmHub data ingestion repo from a RepoDesignSummary, ingestion plan, or approved
  repo design. Use when scaffolding the Bun and TypeScript project, implementing shapes, source
  fetches, WarmHub operations, QC checks, PAT auth, webhook handlers, cron subscriptions, or a
  verified first ingest into a real WarmHub repo. Trigger phrases: "build warmhub repo", "scaffold
  warmhub repo", "implement this ingestion plan", "build an ingestion pipeline", "ingest data into
  warmhub".
---

# Build WarmHub Repo

<objective>

Guide the user through building a production-ready WarmHub data ingestion repo after the repo model
and ingestion plan are known. The output is a TypeScript/Bun project that:
1. Defines WarmHub shapes for the domain
2. Fetches and parses data from an external source
3. Transforms rows into WarmHub operations (things + assertions)
4. Commits in batches with dedup and conflict handling
5. Runs QC checks that produce Assessment assertions
6. Supports local dev and automated execution with an explicit `WH_TOKEN` PAT provider
7. Has webhook/cron subscriptions for automated ingest and QC

</objective>

## Inputs

Prefer a project-state manifest with `repoDesignSummary` and `ingestion`. Also accept a pasted
RepoDesignSummary, a source plan, or an existing repo path plus enough design detail to proceed.

If durable entities, assertions, about-cardinality, four-direction traversal results, idempotency,
QC policy, or source access are still unresolved, stop and hand off to `design-warmhub-repo` or
`plan-warmhub-ingestion` instead of inventing the model.

## Stage Rules

- Implement only the approved data repo and ingestion path.
- Do not redesign shapes unless the supplied plan is internally inconsistent; ask one question or
  return to the design stage when that happens.
- Treat `repoDesignSummary.assertionModel[].aboutCardinality` and `.fourDirection` as build
  requirements. If absent, route back to `design-warmhub-repo`.
- Treat `repoDesignSummary.assertionModel[].deferredContract` as the design's future primitive
  contract and `ingestion.deferredPrimitives` as the implementation retreat plan. If they diverge,
  route back to `design-warmhub-repo` / `plan-warmhub-ingestion`; implement staged raw keys only from
  the ingestion plan.
- Use the project-state manifest if present, and append build outputs, verification commands, and
  unresolved risks to it.
- This stage is not complete with only local files, local JSON exports, or a runnable scaffold. It is
  complete only after the target WarmHub repo is created or verified, shapes are created or updated,
  at least one bounded source slice is committed, QC/Assessment data is written when applicable, and
  representative facts are read back from WarmHub.
- If the request or manifest requires a component/runtime such as Veritas, do not simulate it with
  local fields. Create the proposition/source data this repo owns, then route to
  `add-warmhub-component` for installation and health before any display treats component outputs as
  authoritative.
- Keep private paths, tokens, and local-only URLs out of generated user-facing instructions.
- Treat human/mobile collection output from `build-warmhub-collector` as a source described by the
  ingestion plan, not as an app-building task for this stage.

<quick_start>

```bash
# 0. One-time local prerequisites
node --version  # must be >= 22
npm install -g @warmhub/cli
wh auth login
wh token create --name my-data-ingest --scope repo:write
export WH_TOKEN="<token-from-command>"

# 1. Scaffold project
mkdir my-data-repo && cd my-data-repo
bun init -y
# 2. Install the SDK
bun add @warmhub/sdk-ts
# 3. Set up shapes, auth, CLI, operations, QC
# (see workflow below)
# 4. Create WarmHub repo and shapes
wh repo create <org>/<repo> -d "initial" --visibility private
bun run src/cli.ts setup
# 5. Ingest and validate
bun run src/cli.ts ingest --latest
bun run src/cli.ts qc --latest
# 6. Set up cron subscriptions (cron fires a POST to your deployed handler URL)
wh sub create monthly-ingest --repo <org>/<repo> --kind cron --cronspec "0 12 15 * *" --webhook-url <handler-url>
```

</quick_start>

<interview_mode>

When the repo design is underspecified, conflicting, or the user asks to be grilled, stop
scaffolding and interview first.

- Ask one question at a time.
- Give a recommended default answer for every question.
- Resolve parent decisions before child decisions.
- Skip branches that are no longer relevant once a decision is fixed.
- If the user's main goal is "optimize X" but the honest metric is unclear, use
  `find-self-verifying-objectives` before finalizing QC or automation design.

Walk the tree in this order:
1. Source and access model
2. Update cadence and backfill boundary
3. Durable entities and identity rules
4. Assertions or measurements per period
5. ReportingPeriod model and idempotency key
6. QC checks and failure policy
7. Runtime, auth, and subscription plan
8. WarmHub org and repo naming

After the tree is resolved, summarize the approved design. If the result is still only a design,
hand off to `plan-warmhub-ingestion`; otherwise continue with implementation.

</interview_mode>

<workflow>

## Step 1: Gather Requirements

Ask or infer one question at a time. Recommended defaults:
- What external data source? Recommended: start with one stable API, CSV, XLSX, or JSON endpoint
  before supporting multiple sources.
- How often does the data update? Recommended: ship `--latest` first, then add a bounded backfill
  command before full history.
- What entities or things are in the data? Recommended: model only durable domain identifiers as
  Things.
- What measurements or facts are per-period? Recommended: keep assertions additive, period-scoped,
  and close to the source columns.
- What reporting period and idempotency key should the repo use? Recommended: create an explicit
  `ReportingPeriod` thing and hash the source artifact for idempotency.
- What QC checks and failure policy should apply? Recommended: start with totals-crosscheck,
  completeness, range-validation, and fail closed on cron QC when checks are critical.
- What is the WarmHub org and repo name? Recommended: use a source-domain slug owned by the target
  org.

## Step 2: Scaffold the Project

Use Node 22 or newer. Install and authenticate the WarmHub CLI before creating the repo:

```bash
npm install -g @warmhub/cli
wh auth login
wh token create --name my-data-ingest --scope repo:write
export WH_TOKEN="<token-from-command>"
```

Initialize with Bun and install the public npm SDK:

```bash
bun init -y
bun add @warmhub/sdk-ts
```

Set up `tsconfig.json` with `"module": "ESNext"`, `"moduleResolution": "bundler"`, `"target": "ESNext"`.

Keep generated repositories agent-neutral by default. Do not add local assistant configuration files
unless the user explicitly asks for them.

See [references/project-structure.md](references/project-structure.md) for full file layout.

## Step 3: Define Shapes

Shapes define the schema for things and assertions. See [references/shapes-guide.md](references/shapes-guide.md) for patterns.

Key conventions:
- **Things** represent durable entities (Lender, Station, Product)
- **Assertions** represent facts about things (LenderActivity, StationReading)
- **Relationship assertions** use the approved `aboutCardinality` from `RepoDesignSummary`; do not
  collapse hidden endpoints into flat string fields
- Optional fields use `?` suffix: `"institution?": "string"`
- Always include: `ReportingPeriod`, `ProgramSummary` (or domain equivalent), `IngestRecord`, `Assessment`
- Use only live-verified field forms from the pinned vocabulary: `string`, `number`, `boolean`,
  `wref`, and native arrays. Register shapes before the first write that depends on them.

## Step 4: Implement Auth

The repo authenticates to WarmHub with a `WH_TOKEN` PAT in every environment — local dev, CI, and
the deployed webhook handler that scheduled subscriptions call. See
[references/auth-pattern.md](references/auth-pattern.md) for the complete implementation.

- **WH_TOKEN env var** — a PAT created via `wh token create`, used for local dev, CI, and the
  webhook handler.
- **SDK token wiring** — the SDK does not read `WH_TOKEN` automatically. Create the client with
  `auth.getToken` or `accessToken`; the env var is only the convention your code reads from.

Inbound webhook deliveries (WarmHub → your handler) are authenticated separately, via a bound
credential set, not via WH_TOKEN. Managed in-platform action execution and per-run stdin tokens were
removed from the platform; subscriptions now deliver to a webhook handler you operate. See
[references/auth-pattern.md](references/auth-pattern.md).

**Do not** read from `~/.warmhub/auth.json` — that file contains the wh CLI's own session token and is not intended for external use.

## Step 5: Build the Ingestion Pipeline

See [references/operations-guide.md](references/operations-guide.md) for the complete pattern.

Key concepts:
- **Prefer semantic commits**: Start with one natural unit per commit (for example one reporting period) when it fits comfortably.
- **Use paginated reads for dedup/QC**: `thing.head()` and `thing.query()` default to 50 items and support `cursor`; page through results instead of assuming a hard 1000-item ceiling.
- **Escalate large commit planning deliberately**: If a period or backfill becomes large enough that partitioning, resumability, or commit sizing is non-trivial, switch to `wh-commit-design` before coding the ingest path.
- **Conflict isolation is optional**: Split entity adds from assertions only when you need cleaner retry semantics around existing things.
- **Idempotency**: Hash the source artifact. Skip if IngestRecord exists with the same hash.
- **Local-green is not live-green**: after shape setup, write a representative 100-1000 row toy slice
  before any large ingest. Verify per-shape counts, `wh repo describe`, and the load-bearing
  traversals/readbacks the design promised.

## Step 6: Implement QC Checks

QC checks produce Assessment assertions about ReportingPeriod things. See [references/qc-pattern.md](references/qc-pattern.md).

Standard checks:
- **totals-crosscheck** — sum of detail rows matches summary total
- **range-validation** — no negative values, no unreasonable outliers
- **completeness** — actual count matches expected count

## Step 7: Create the CLI

Structure the CLI with subcommands:
- `setup` — create shapes in WarmHub
- `ingest --latest | --fy <year>` — ingest a single period
- `backfill` — ingest all historical periods
- `qc --latest | --period <label>` — run quality checks

For local and CI use, the subcommands run directly. When the repo is deployed as a webhook handler
for scheduled automation, parse the delivery payload (the POST body) and dispatch the matching
command — see `readDeliveryInput()` in [references/auth-pattern.md](references/auth-pattern.md).

## Step 8: Create the WarmHub Repo and Run

```bash
# Create repo
wh repo create <org>/<repo> -d "initial repo" --visibility private

# Create shapes
bun run src/cli.ts setup

# Run initial ingest
bun run src/cli.ts ingest --latest

# Run QC
bun run src/cli.ts qc --latest
```

Read back representative records before reporting success:

```bash
wh thing query --repo <org>/<repo> --shape <DurableThing> --limit 3 --json
wh thing query --repo <org>/<repo> --shape <KeyAssertion> --limit 3 --json
```

If repo creation, shape setup, commit, or readback is blocked by credentials, CLI capability, or
backend errors, say exactly which command blocked and leave the stage as blocked rather than
describing it as locally complete.

## Step 8a: Verify Relationship Traversability

Copy or keep [scripts/verify-relationships.mjs](scripts/verify-relationships.mjs) in the generated
repo and run it as soon as shape definitions exist:

```bash
node scripts/verify-relationships.mjs --manifest .warmhub-builder/project-state.json --dry-run
```

After the first bounded ingest creates assertion instances, run the live check:

```bash
node scripts/verify-relationships.mjs --repo <org>/<repo> --sample-size 10
```

If either check fails before meaningful data is loaded, return to `design-warmhub-repo` for
cardinality fixes before loading more data. If bad `about` targets or shape semantics are already
populated, use [references/migrations.md](references/migrations.md) for the retract-and-replay
runbook before writing replacement data.

## Step 9: Set Up Cron Subscriptions

A cron subscription fires on a schedule and sends an HTTP POST to a `--webhook-url` you control. The
platform no longer runs your code in a managed container — instead, deploy this repo as a webhook
handler at a public HTTPS endpoint, and point the subscription at it. The handler reads the delivery
payload (`event: "warmhub.cron"`) and runs the matching ingest/QC command (see Step 7 and
[references/auth-pattern.md](references/auth-pattern.md)).

Use `wh sub create` with `--kind cron`. The webhook URL must be public HTTPS (no localhost / private
IPs); minimum cron interval is 5 minutes:

```bash
# Monthly ingest (15th at noon UTC) -> POSTs to your handler's ingest route
wh sub create monthly-ingest \
  --repo <org>/<repo> \
  --kind cron \
  --cronspec "0 12 15 * *" \
  --webhook-url https://<your-handler-host>/ingest

# Weekly QC (Monday 6am UTC) -> POSTs to your handler's qc route
wh sub create weekly-qc \
  --repo <org>/<repo> \
  --kind cron \
  --cronspec "0 6 * * 1" \
  --webhook-url https://<your-handler-host>/qc
```

Authenticate inbound deliveries by binding a credential set with `WEBHOOK_*` keys (e.g.
`WEBHOOK_SIGNING_SECRET` or `WEBHOOK_BEARER_TOKEN`) so your handler can verify the request really
came from WarmHub:

```bash
wh credential create ingest-webhook --repo <org>/<repo>
echo "<shared-secret>" | wh credential set ingest-webhook WEBHOOK_SIGNING_SECRET --repo <org>/<repo>
wh sub bind monthly-ingest --credentials ingest-webhook --repo <org>/<repo>
wh sub bind weekly-qc --credentials ingest-webhook --repo <org>/<repo>
```

Verify: `wh sub list --repo <org>/<repo>`

## Step 10: Prepare Final Repo Handoff

Do not mutate a public catalog from this skill. Prepare the terminal repo handoff material instead:

- repo path and WarmHub repo identity
- README or usage notes
- setup, first-ingest, QC, test, and relationship-verifier commands run
- validation receipts, caveats, and skipped or blocked live checks
- remaining credential, deployment, subscription, collector, display, or component work

Append those details to the project-state manifest's `validationReceipts` and `finalHandoff`
fields when this is the terminal stage; otherwise include them in the next-step handoff.

</workflow>

<pitfalls>

- **`thing.head()` / `thing.query()` default to 50 items** — always set `limit` intentionally and follow `nextCursor` when the dataset can exceed one page
- **Conflict retries should be surgical** — if entity adds collide with existing data, remove only the conflicting op and retry; do not discard the whole batch
- **Handler auth is via `WH_TOKEN` PAT** — the deployed handler writes back to WarmHub with its own PAT; inbound deliveries are verified via a bound `WEBHOOK_*` credential set. There is no per-run stdin token
- **Shape optional fields** — use `"field?": "type"` syntax, not a separate optional flag
- **Shape updates** — use `wh shape update` with the full field set; you cannot add a single field in isolation
- **Commit attribution** — if you pass `opts.committer` to `client.commit.apply`, it must be a full
  existing thing wref such as `Agent/data-ingest`, not a bare name
- **Assertion `about` field** — required on `add`, omitted on `revise`
- **Collection `about` values** — `about` accepts a wref only; inline `{ "set": [...] }` / `{ "pair": [...] }`
  objects are rejected. Emit the collection as its own named `add` op (`kind: "collection"`, `type`,
  `members`) first, then point the assertion's `about` at the resulting `Set/…` / `Pair/…` wref. Use a
  deterministic, member-derived collection name so re-runs and `--skip-existing` stay replay-safe
- **Version-pinned wrefs** — `@vN` reads a historical target by design; do not use pinned examples as
  proof that HEAD re-resolution works
- **Add ops are not replay-safe by themselves** — deterministic names plus conflict/idempotency logic
  make replay safe, not the `add` verb
- **Do not cargo-cult old Convex-era batch limits** — returned WarmHub supports larger commit workflows; use semantic commit planning or `wh-commit-design` instead of hard-coding `200 ops per commit`

</pitfalls>

## Output Shape

Return:

- repo path and WarmHub repo identity
- shapes and operations implemented
- source fetch, transform, idempotency, and QC paths implemented
- commands run for setup, first ingest, QC, tests, and validation
- relationship-verifier receipts for design-time and live checks, or exact blocker
- manifest fields updated, or exact fields the user should add
- remaining deployment, credential, or subscription work

## Success Criteria

- The scaffold matches the approved RepoDesignSummary and ingestion plan.
- The repo can create or update shapes, ingest one bounded slice, and run QC locally.
- The target WarmHub repo exists, the first bounded ingest has been committed to WarmHub, and
  representative facts have been read back from WarmHub.
- Relationship verification passes for the approved design, or blocks before large ingest.
- Auth uses a PAT environment variable for WarmHub writes; inbound webhook auth is handled through
  declared credentials when subscriptions are used.
- Any large ingest path has an explicit commit-size or resumability plan.
- The answer ends with a next-step block.

## References

- [references/project-structure.md](references/project-structure.md) — project layout.
- [references/shapes-guide.md](references/shapes-guide.md) — shape conventions.
- [references/auth-pattern.md](references/auth-pattern.md) — PAT and webhook auth.
- [references/operations-guide.md](references/operations-guide.md) — operations, commits, idempotency.
- [references/qc-pattern.md](references/qc-pattern.md) — Assessment assertions and checks.
- [references/migrations.md](references/migrations.md) — populated-graph retract-and-replay
  migration runbook.
- [scripts/verify-relationships.mjs](scripts/verify-relationships.mjs) — design-time and live
  relationship traversability verifier.

## Next steps

After the repo builds and verifies, choose the next move:

- **Package as a component** — `Use add-warmhub-component with this repo and manifest.`
- **Build a collector** — `Use build-warmhub-collector with the write-path implications.`
- **Build a display** — `Use build-warmhub-display with the repo facts and attribution needs.`
- **Share repo** — provide README, ingest/QC receipts, caveats, and reproduce commands.

End with:

```text
Next step:
- Recommended: <one next stage or action>
- Alternatives: <short list of valid next stages/actions>
- Manifest updated: <path or not updated>
- Ready for: <stage-name or human decision>
- Blocking questions: <none or concise list>
```
