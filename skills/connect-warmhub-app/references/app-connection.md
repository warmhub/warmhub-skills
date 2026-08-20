# App Connection

Use this reference to connect a TypeScript app, server-rendered route, Worker, report generator, or
notebook to WarmHub.

## Baseline Steps

1. Create or enter the smallest project for the selected runtime.
2. Install the public SDK when the runtime can use it:

   ```bash
   bun add @warmhub/sdk-ts
   ```

3. Configure:
   - `WARMHUB_API_URL` for the API endpoint when the default is not enough.
   - `WARMHUB_REPO` as `org/repo`.
   - `WH_TOKEN` as a server-side secret or local-only env var.
4. Prove one fact from WarmHub before adding display or collector logic.

## TypeScript Probe

Adapt to the app's existing structure and SDK version. Keep the probe server-side.

```typescript
import { WarmHubClient } from '@warmhub/sdk-ts'

function repoParts(): { org: string; repo: string } {
  const value = process.env.WARMHUB_REPO
  if (!value) throw new Error('WARMHUB_REPO is required')
  const [org, repo] = value.split('/')
  if (!org || !repo) throw new Error('WARMHUB_REPO must be org/repo')
  return { org, repo }
}

export function createWarmHubClient(): WarmHubClient {
  return new WarmHubClient({
    auth: {
      getToken: async () => {
        const token = process.env.WH_TOKEN
        if (!token) throw new Error('WH_TOKEN is required')
        return token
      },
    },
  })
}
```

Then fetch one stable fact, such as repo metadata, a shape list, or the first page of a known shape.
Use the app's actual SDK version for method names; do not guess beyond the installed package's API.

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
