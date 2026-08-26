# Project Structure

## TypeScript/Bun Layout

```
my-data-repo/
├── package.json
├── tsconfig.json
├── README.md                    # Human orientation; mirror to Content/Readme
├── AGENTS.md                    # Repo-specific agent guidance; mirror to Content/Agents
├── LICENSE                      # Authoritative license text when explicitly declared
├── src/
│   ├── cli.ts                 # CLI entry point with subcommands
│   ├── config.ts              # Org, repo, URLs, constants
│   ├── auth.ts                # Token provider (WH_TOKEN PAT)
│   ├── shapes.ts              # WarmHub shape definitions
│   ├── operations.ts          # Transform rows → WarmHub operations
│   ├── dedup.ts               # Check existing things for idempotency
│   ├── qc.ts                  # Quality checks → Assessment assertions
│   ├── <source>-parser.ts     # Parse external data (XLSX, CSV, JSON)
│   └── <source>-client.ts     # Fetch from external API/source
└── test/
    ├── operations.test.ts
    ├── parser.test.ts
    └── qc.test.ts
```

## package.json

```json
{
  "name": "my-data-repo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "ingest": "bun run src/cli.ts ingest",
    "backfill": "bun run src/cli.ts backfill",
    "setup": "bun run src/cli.ts setup",
    "qc": "bun run src/cli.ts qc",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@warmhub/sdk-ts": "^0.54.0"
  },
  "devDependencies": {
    "@types/bun": "^1.2.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true,
    "types": ["bun-types"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## config.ts

```typescript
export const ORG = '<org>'
export const REPO = '<repo>'
// Optional commit attribution. Create this Thing first before passing it as opts.committer.
export const COMMITTER_WREF = 'Agent/data-ingest'
```

## Python Layout

Keep the same responsibilities in a standard Python project: `pyproject.toml`, `src/repo_ingest/` for
the CLI, auth, shapes, operations, dedup, QC, and source code, plus `tests/`. Install the SDK with
`python -m pip install warmhub`; use `WarmHubClient.from_env()` for `WH_TOKEN`.
