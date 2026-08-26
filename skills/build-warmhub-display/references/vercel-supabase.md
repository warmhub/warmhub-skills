# Vercel + Supabase Display Branch

Use when the rubric selects a durable web app rather than a lightweight display.

Before building routes or projections, compose `connect-warmhub-app` or its minimal fallback to settle
server-side token handling, one-fact WarmHub probe, sharing mode, and source attribution. This branch
adds app persistence and richer display workflows; it should not mirror the whole WarmHub graph into
Supabase by default.

## Best Fit

- Authenticated private or team sharing.
- Public app with richer interactions.
- Durable derived tables or user-specific state.
- Filtering, saved views, comments, annotations, or workflows beyond a small API.

## First Draft Shape

```text
app-name/
├── src/
│   ├── app-or-routes/
│   ├── components/
│   └── lib/
├── supabase/
│   └── migrations/
├── package.json
└── .env.example
```

## Planning Questions

- Does the app need real user auth or just private deployment?
- Which WarmHub shapes become derived tables?
- Is Supabase a cache/projection, or does the app own new user data?
- What refresh mechanism keeps Supabase aligned with WarmHub?
- Which data is browser-safe and which must stay server-side?

Use `add-warmhub-component` when refresh/projection automation needs a reusable component. Keep this
display branch focused on the app surface and derived read model.

## Read And Projection Choice

Follow [read-patterns.md](read-patterns.md). Keep a one-shot server read or static snapshot when it
answers the app; introduce an incremental Supabase projection only for a long-lived derived model.
Use a stored View plus View-backed grant only for a repeatable non-incremental subset. Incremental
reads require unrestricted repository read authority.

## Validation

- Local app can fetch a WarmHub repo through a server-side route.
- Supabase schema covers only selected derived projections, not the whole WarmHub graph by default.
- Browser bundle does not expose WarmHub service credentials.
- Deployment env vars are separated into server-only and public variables.
- Shared app layout includes the source WarmHub attribution chosen by `connect-warmhub-app` on every
  human-facing page.
