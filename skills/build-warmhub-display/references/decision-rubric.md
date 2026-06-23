# Decision Rubric

Score each path from 0 to 3 on each axis. Use visible repo facts first, then ask one short question for missing high-impact axes. A difference of 3 or more points is usually a clear winner.

Use this after repo facts and the app connection substrate are known. Prefer `discover-warmhub-repo`
for live repo facts and `connect-warmhub-app` for sharing mode, token boundary, one-fact probe, and
source attribution. This rubric only chooses the display surface.

## Axes

| Axis | Notebook | Observable | Cloudflare Workers | Vercel + Supabase |
| --- | --- | --- | --- | --- |
| Audience | One analyst or research group | Public/team data story or dashboard | Public or link-shared lightweight surface | Authenticated team or product users |
| Lifetime | One-off or exploratory | Shareable report/dashboard | Durable small display/API | Durable app surface |
| Interactivity | Explore, plot, model | Charts, inputs, narrative data app | Browse, filter, small API | App workflows, sessions, user state |
| Sensitivity | Local/private | Public-safe snapshots or private workspace | Public-safe or simple route protection | Private/auth-gated |
| Update cadence | Manual/ad hoc | Build-time loaders, scheduled static rebuild | Manual, scheduled, edge cache | Scheduled sync plus derived tables |
| Ops tolerance | None | Low static hosting/build | Low | Managed services accepted |
| Persistence | Notebook state/dataframes | Static snapshots/client state | None first; KV/D1 later by threshold | Supabase tables expected |

## Scoring Heuristics

- Notebook wins when the user needs analysis before sharing, wants charts/tables, or has no deployment tolerance.
- Observable wins when the user wants polished visual exploration, a public/unlisted data story, or a static dashboard without custom app auth or request-time backend logic.
- Workers wins when the user wants a public or lightweight shared display, simple routes, low ops, and no app database yet.
- Vercel+Supabase wins when auth, user-specific state, durable derived tables, or richer UI workflows are central.

## Output Format

```text
Recommendation: Observable
Scores: Observable 18, Workers 15, Vercel+Supabase 11, Notebook 9
Reason: public-safe interactive data story, build-time refresh, chart-heavy UI, low ops tolerance.
Loaded references: observable.md
```

If scores are close, say what would flip the decision. Example: "If this needs per-user private views, Vercel+Supabase becomes the default."

Record the result in the project-state manifest:

```json
{
  "display": {
    "needed": true,
    "surface": "observable | cloudflare-workers | vercel-supabase | ipython-notebook",
    "status": "planned"
  }
}
```
