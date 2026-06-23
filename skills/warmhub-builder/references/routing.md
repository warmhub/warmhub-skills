# Routing

Use this reference after intake to choose the project shape and first stage.

## Shape Selection

| User state | Collects new data? | Needs read/display surface? | Shape |
| --- | --- | --- | --- |
| No WarmHub repo yet | no | no | `data-only` |
| No WarmHub repo yet | yes | no | `data+collect` |
| No WarmHub repo yet | no | yes | `data+display` |
| No WarmHub repo yet | yes | yes | `data+collect+display` |
| Existing WarmHub repo | yes | no or later | `collect-on-existing-repo` |
| Existing WarmHub repo | no | yes | `display-on-existing-data` |

When the answer is ambiguous, ask which first useful output matters most. Recommended default:
choose the smallest shape that produces a real artifact without blocking later branches.

## First Route

| Shape | First stage | Why |
| --- | --- | --- |
| `data-only` | `design-warmhub-repo` | The data model must exist before ingestion or repo build. |
| `data+collect` | `design-warmhub-repo` | The collector needs shapes, identity, write model, and QC. |
| `data+display` | `design-warmhub-repo` | The display should consume `RepoDesignSummary`, not invent facts. |
| `data+collect+display` | `design-warmhub-repo` | Both app tracks depend on the data model and manifest. |
| `collect-on-existing-repo` | `discover-warmhub-repo` | Existing repo facts must be read before collector/write planning. |
| `display-on-existing-data` | `discover-warmhub-repo` | Existing repo facts must be read before surface selection. |

If the first stage is not installed, stop with a copy-pasteable prompt for that stage. Do not perform
the stage inline.

## Main Chain

For new repos:

```text
warmhub-builder
  -> design-warmhub-repo
  -> veritas-design when reputation-weighted consensus is required
  -> plan-warmhub-ingestion
  -> build-warmhub-repo
  -> add-warmhub-component when a component/runtime is required or automation is packaged
  -> build-warmhub-collector and/or build-warmhub-display
  -> final handoff with demo, caveats, and reproduce notes
```

If the user names a WarmHub runtime/component such as Veritas, SCAR, or another installed component,
that dependency is part of the main path rather than an optional follow-up. For Veritas, route
through `veritas-design` after repo design and before ingestion planning so the write path creates
stable binary proposition assertions, source Things, `Certainty` assertions, and any oracle inputs
correctly.
Then route through `add-warmhub-component` after the repo exists and before any display claims to
consume `Consensus` or other runtime outputs.

For existing repos:

```text
warmhub-builder
  -> discover-warmhub-repo
  -> build-warmhub-collector or build-warmhub-display
```

`build-warmhub-collector` must hand write-path implications back to `plan-warmhub-ingestion` because
human collection is an ingestion source.

`build-warmhub-display` and `build-warmhub-collector` should compose `connect-warmhub-app` for SDK,
auth, one-fact probe, sharing mode, and source attribution.

Do not call a new-repo path complete until `build-warmhub-repo` has created or verified the WarmHub
repo, created or updated shapes, committed at least one bounded slice, and read representative facts
back from WarmHub. Local JSON exports and runnable code are useful intermediate artifacts, not a
completed WarmHub repo.

## Alternatives

Offer alternatives only when valid:

- For any new-repo shape: iterate intake, design repo, or narrow to data-only.
- For Veritas-required paths: run `veritas-design`, or simplify to repo-owned confidence/BDU fields
  if Veritas does not fit.
- For `data+collect`: design repo, or start from an existing repo if the user already has one.
- For `data+display`: design repo, or discover an existing repo if one exists.
- For existing-repo shapes: discover repo facts first, or stop if repo identity is sensitive or
  unavailable.
