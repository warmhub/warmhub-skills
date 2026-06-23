# Cloudflare Workers Display Branch

Use when the rubric selects a lightweight shared display, public-safe data view, small API, or low-ops deployment.

This first branch is Workers-only. Do not implement D1, KV, R2, Queues, Durable Objects, or Hyperdrive unless the user explicitly asks or the project crosses the thresholds below.

Before adding display routes, use `connect-warmhub-app` or its minimal fallback to prove one
server-side WarmHub read and decide the sharing mode. This reference covers only the Workers-specific
display shape.

## Sources To Check

- Workers get started: https://developers.cloudflare.com/workers/get-started/guide/
- Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/

Cloudflare's current get-started path uses `npm create cloudflare@latest -- <name>`, then `wrangler dev` for local development and `wrangler deploy` for deploy.

## First Draft Shape

```text
worker-name/
├── src/
│   └── index.ts
├── test/
│   └── smoke.http
├── wrangler.jsonc
├── package.json
└── .dev.vars.example
```

Prefer route handlers like:

- `GET /` - small HTML index or redirect to a primary view, with WarmHub source attribution in the shared page chrome.
- `GET /api/repo` - repo metadata and freshness.
- `GET /api/shapes` - shape counts.
- `GET /api/things?shape=ShapeName` - selected thing rows with pagination.

## Auth And Env

Use Worker secrets for deployed credentials and Worker vars for non-secret config. Follow the token
boundary chosen by `connect-warmhub-app`. For a public display backed by a private WarmHub repo, this
is the key distinction: public data may be fine, but the repo-read credential must stay server-side.

```bash
npx wrangler secret put WH_TOKEN
```

Recommended first pass:

- `WARMHUB_API_URL` and `WARMHUB_REPO` as non-secret Worker vars in `wrangler.jsonc`.
- `WH_TOKEN` as a Cloudflare secret, scoped to `<org>/<repo>=repo:read`.
- `.dev.vars` or `.env` only for local development. Do not commit either file.

Make `workers_dev` and `preview_urls` explicit in `wrangler.jsonc` so the public URL behavior is not an implicit Wrangler default.

## Fetch Pattern

Start with the one-fact probe from `connect-warmhub-app`, then expand it into display routes. Use
direct WarmHub HTTP fetch or a runtime-verified SDK call. The Worker should:

1. Read `env.WARMHUB_API_URL`, `env.WARMHUB_REPO`, and `env.WH_TOKEN`.
2. Add bearer auth server-side only.
3. Return JSON with clear errors for missing env, auth failure, or upstream failure.
4. Cache only public-safe responses.

## When To Add Cloudflare Storage Later

- Add KV when the same public response is read heavily and can tolerate eventual consistency.
- Add D1 when the display needs durable derived tables or joins separate from WarmHub.
- Add R2 when the display produces larger static artifacts or exports.
- Add Queues/cron when refresh work no longer fits a request path.

Do not introduce these in the first branch just because they exist.

## Validation

- `npm create cloudflare@latest -- <name>` completes.
- `npm run dev` or `npx wrangler dev` serves locally.
- Missing env returns an explicit setup error.
- A valid token can fetch repo/shape data.
- Public routes do not expose tokens or private repo details.
- Token-handling/security notes live in README/deploy docs, not visible page chrome.
- Human-facing pages include the source WarmHub attribution chosen by `connect-warmhub-app`.
- `npx wrangler deploy` succeeds when the user is ready to deploy.
