# Auth And Sharing

Choose the sharing mode before detailed auth plumbing.

Ask two separate questions:

1. Can the data itself be public?
2. Which credentials are needed to read or write it, and how narrowly can they be scoped?

Public-safe data can still require a private server-side token when the backing WarmHub repo is
private. In that case, a public display may be acceptable only if the deployed code keeps the token on
the server side and emits only public-safe output.

## Modes

| Mode | Typical fit | Notes |
| --- | --- | --- |
| Local-only | notebook, local report, internal analysis | Keep tokens local. Do not deploy. |
| Public data story/report | static build or notebook export | Use build-time data loaders and output only public-safe snapshots. |
| Public read-only | edge/server display | Use public-safe data or generated public projection; token stays server-side if needed. |
| Link-shared/lightly private | protected route or signed path | Acceptable only for low-risk sharing; do not use as real authorization. |
| Authenticated private app | app with users and access control | Prefer real auth, user state, and scoped server credentials. |
| Write/collector app | mobile or form capture | Decide contributor identity and write authorization before implementing submissions. |

## Token Rules

- Never commit WarmHub PATs, `.env`, local secret files, Worker secrets, or notebook cells containing
  token values.
- Keep `WH_TOKEN` server-side or local-only.
- Keep `WARMHUB_API_URL` and `WARMHUB_REPO` as non-secret config.
- Prefer the narrowest useful token scope, such as repo read for displays and explicit write scope
  only for collectors or handlers that submit data.
- Separate service credentials from browser-exposed variables.
- For deployed handlers, store secrets in the host platform's secret manager.
- For notebooks, use environment variables or a local secrets manager; do not publish secret-backed
  notebooks.

## Display Safety

Classify data as:

- `public-safe`: can be served directly.
- `internal`: requires auth, local-only handling, or a private deployment inside the organization.
- `private`: requires auth, local-only handling, or a private deployment for restricted data.
- `unknown`: treat as private until the user decides.

Do not turn unknown-sensitivity data into a public app or public static output by default.

## Collector Safety

For write paths, confirm:

- who or what is the contributor identity;
- whether anonymous device/app identity is acceptable;
- whether a WarmHub account is required;
- what anti-abuse, rate limiting, review, or QC-at-ingress policy applies;
- whether writes go directly to WarmHub or through a deployed handler.
