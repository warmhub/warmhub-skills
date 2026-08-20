# Observable Display Branch

Use when the rubric selects a polished data story, interactive report, visualization-heavy dashboard, or browser-first exploratory notebook.

Prefer Observable Framework for new durable displays. Use Observable notebooks only when the user explicitly wants Observable-hosted exploration or collaboration.

Before adding charts or narrative pages, use `connect-warmhub-app` or its minimal fallback to settle
sharing mode, build-time token handling, one-fact probe, and source attribution. This reference covers
only Observable-specific display scaffolding.

## Sources To Check

- Framework overview: https://observablehq.com/framework/
- Framework getting started: https://observablehq.com/framework/getting-started
- Framework data loaders: https://observablehq.com/framework/data-loaders
- Framework deploying: https://observablehq.com/framework/deploying
- Data app build secrets and hosting deprecation: https://observablehq.com/documentation/data-apps/secrets
- Notebook secrets: https://observablehq.com/documentation/security/secrets
- Notebook sharing: https://observablehq.com/documentation/collaboration/sharing

Observable Framework is the current path for file-backed static data apps, dashboards, and reports. Do not recommend Observable Cloud managed hosting for new data apps; Observable's docs say that hosting data apps on Observable Cloud is deprecated. Build the Framework app and deploy it to the user's preferred static hosting provider.

## Best Fit

- Public, unlisted, or team-shared dashboards and data stories.
- Interactive charts, filters, maps, tables, and narrative analysis.
- Build-time WarmHub fetches that produce public-safe static snapshots.
- Users who want Observable Plot, D3, DuckDB, Arquero, Vega-Lite, or related data-viz tools without building a full app shell.

## Poor Fit

- Request-time private data access or per-user authorization.
- App workflows with sessions, saved user state, comments, or user-owned writes.
- Runtime API endpoints or webhook receivers.
- Python-heavy local modeling where IPython notebooks are a better fit.

## First Draft Shape

```text
observable-app/
├── .env.example
├── .gitignore
├── observablehq.config.js
├── package.json
├── src/
│   ├── index.md
│   └── data/
│       └── warmhub-summary.json.js
└── README.md
```

Start with:

```bash
npm init -y
npm install @observablehq/framework @warmhub/sdk-ts dotenv
# after adding package scripts and src files:
npm run dev
```

Framework requires Node.js. Follow the current getting-started docs for the supported version floor. `npx "@observablehq/framework@latest" create` is fine for an interactive blank app, but for WarmHub starters it is usually faster to scaffold the minimal files above so the data loader and source backlink are correct from the first draft.

Use this baseline `package.json` shape:

```json
{
  "type": "module",
  "scripts": {
    "dev": "observable preview --host 127.0.0.1 --port 3000",
    "build": "observable build",
    "clean": "rm -rf dist .observablehq/cache src/.observablehq/cache"
  },
  "dependencies": {
    "@observablehq/framework": "^1.13.0",
    "@warmhub/sdk-ts": "^0.54.0",
    "dotenv": "^16.4.0"
  }
}
```

Add `observablehq.config.js`:

```js
export default {
  root: "src",
};
```

Add `.gitignore` entries for `node_modules/`, `dist/`, `.observablehq/cache/`, `src/.observablehq/cache/`, and `.env`.

Add `.env.example`:

```bash
WARMHUB_API_URL=https://api.warmhub.ai
WARMHUB_REPO=example/repo
WH_TOKEN=
```

## WarmHub Fetch Pattern

For Framework:

1. Fetch WarmHub with a data loader such as `src/data/warmhub-summary.json.js`.
2. Read `WARMHUB_API_URL`, `WARMHUB_REPO`, and `WH_TOKEN` from build/deploy environment variables.
3. Output only the public-safe JSON/CSV needed by the page.
4. Load the generated file in pages with `FileAttachment`.
5. Treat the generated file as public if the app is public.

Use SDK row fields, not CLI JSON fields. `client.thing.queryAll` and `headAll` rows expose:

- `wref`: full WarmHub reference, e.g. `CoffeeBean/ethiopia-yirgacheffe`.
- `name`: local name only, e.g. `ethiopia-yirgacheffe`.
- `data`: current payload.
- `version`: current numeric version.
- `aboutWref`: assertion target for assertion rows.

Do not read `row.version.data`, `row.version.version`, `row.about`, or `row.name` as the full wref in SDK data loaders.

Minimal data-loader pattern:

```js
import "dotenv/config";
import { WarmHubClient } from "@warmhub/sdk-ts";

const apiUrl = process.env.WARMHUB_API_URL || "https://api.warmhub.ai";
const repoSlug = process.env.WARMHUB_REPO;
const token = process.env.WH_TOKEN;

if (!repoSlug) throw new Error("WARMHUB_REPO is required");
if (!token) throw new Error("WH_TOKEN is required");

const [orgName, repoName] = repoSlug.split("/");
if (!orgName || !repoName) throw new Error("WARMHUB_REPO must be org/repo");

const client = new WarmHubClient({
  apiUrl,
  auth: { getToken: async () => token },
});

const [repo, stats, rows] = await Promise.all([
  client.repo.get(orgName, repoName),
  client.repo.getStats(orgName, repoName),
  client.thing.queryAll(orgName, repoName, { max: 500 }),
]);

const stripVersion = (wref) =>
  typeof wref === "string" ? wref.replace(/@v\d+$/, "") : "";

const snapshot = {
  generatedAt: new Date().toISOString(),
  sourceRepo: repoSlug,
  sourceUrl: `https://app.warmhub.ai/orgs/${orgName}/repos/${repoName}`,
  repo: {
    orgName: repo.orgName,
    name: repo.name,
    displayName: repo.displayName ?? repo.name,
    description: repo.description ?? "",
  },
  stats,
  rows: rows.map((row) => ({
    wref: row.wref,
    name: row.name,
    kind: row.kind,
    shapeName: row.shapeName,
    aboutWref: stripVersion(row.aboutWref),
    data: row.data ?? {},
  })),
};

process.stdout.write(JSON.stringify(snapshot, null, 2));
```

For shape-specific dashboards, query only the needed shapes and join assertion rows to thing rows with `stripVersion(assertion.aboutWref) === thing.wref`.

## Page Pattern

Load the generated data with `FileAttachment`, use Observable Plot or Inputs for the first useful view, and include a source backlink to the WarmHub repo unless the repo identity is sensitive.

````md
---
title: WarmHub Display
theme: [light, dashboard]
---

```js
const data = await FileAttachment("data/warmhub-summary.json").json();
const rows = data.rows;
```

<section class="hero">
  <h1>${data.repo.displayName}</h1>
  <a href="https://app.warmhub.ai/orgs/example/repos/repo" target="_blank" rel="noopener">Source data on WarmHub</a>
</section>
````

Do not interpolate a JavaScript value directly inside a raw HTML attribute; Framework will treat it
as a literal link. If the URL is dynamic, render the whole link from JavaScript with `html` instead
of interpolating only the attribute.

Do not put implementation/security assurances in visible page chrome, such as "server-side fetch" or "token not exposed." Keep those notes in the README or deploy docs and prove them with validation checks.

If custom CSS is added, use Observable theme variables such as `var(--theme-foreground)` and `var(--theme-foreground-muted)`. If the design assumes a light dashboard, set `theme: [light, dashboard]`; the bare `dashboard` theme supports light/dark preference and can expose contrast mistakes in custom hard-coded colors.

For Observable notebooks:

- Use `Secret("WH_TOKEN")` only in private notebooks.
- Do not publish a notebook that depends on secrets; published notebooks cannot access them.
- For public notebooks, use public WarmHub data or static attachments.

## Deployment

- Build the Framework app with `npm run build`.
- Deploy the built static site to GitHub Pages, Netlify, Vercel, Cloudflare Pages, or another static host.
- Use scheduled CI builds when the WarmHub data should refresh automatically.
- Keep `.env` out of git; use the host's secret/environment-variable mechanism for CI or production builds.
- Configure `WARMHUB_API_URL`, `WARMHUB_REPO`, and `WH_TOKEN` as build-time variables, not browser-exposed runtime variables.

## Validation

- The manual scaffold exists, or `npx "@observablehq/framework@latest" create` completes when using the interactive creator.
- `npm run dev` serves the local preview.
- A data loader can fetch WarmHub repo metadata or selected shape data.
- Build output contains only intended public-safe data, not WarmHub tokens or unrelated private metadata.
- `npm run build` succeeds.
- The deploy target serves the built static site, or the notebook sharing setting matches the user's audience.
- `npm run clean && npm run build` regenerates loader output after data-loader changes. Observable caches loader results under `src/.observablehq/cache`.
- `rg -n "WH_TOKEN|Bearer|Authorization|accessToken|wh_pat|api\\.warmhub\\.ai" dist` returns no matches for public builds.
- The rendered page includes the WarmHub source attribution chosen by `connect-warmhub-app` and does not include security/implementation assurance copy in visible UI.
- A browser or headless smoke test confirms the page hydrates: metrics, charts, or tables should show real WarmHub values rather than loading placeholders.
