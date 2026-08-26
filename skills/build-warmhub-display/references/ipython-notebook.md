# IPython Notebook Display Branch

Use when the rubric selects local exploration, analysis, or reproducible research before deployment.

Before writing analysis cells, use `connect-warmhub-app` or its minimal fallback to prove one
WarmHub read, decide local-only token handling, and choose source attribution for rendered reports.
This branch is for local analysis and exported reports, not deployed apps.

Use the Python SDK and the contract already selected in [read-patterns.md](read-patterns.md).

## Best Fit

- One analyst or small research group.
- Data understanding before product design.
- Tables, charts, model experiments, or one-off reports.
- Private/internal data that should not be deployed.

## First Draft Shape

```text
notebook-name/
├── notebooks/
│   └── explore.ipynb
├── src/
│   └── warmhub_fetch.py
├── data/
│   └── .gitkeep
├── requirements.txt
└── .env.example
```

## Workflow

1. Fetch WarmHub repo metadata and selected shapes.
2. Convert things/assertions into dataframes.
3. Normalize wrefs into stable columns.
4. Build initial tables and charts.
5. Add the source attribution chosen by `connect-warmhub-app` in a top markdown cell or report footer
   when the repo identity is safe to show.
6. Save only reproducible code, not private data snapshots, unless the user explicitly wants local artifacts.

## Validation

- Notebook runs top-to-bottom in a clean kernel.
- Secrets are read from environment variables, not cells.
- Dataframe construction handles empty shapes and paginated results.
- Output cells make freshness visible: repo, commit/head, fetch time.
- Notebook or rendered report includes WarmHub source attribution when the repo identity is safe to
  show.
