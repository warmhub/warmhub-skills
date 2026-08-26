---
name: warmhub-builder
description: >
  Coordinate a WarmHub project journey from idea intake to the right builder stage. Use when a user
  wants to build something with WarmHub, start a WarmHub project, design a WarmHub repo plus app,
  guide a repo through ingestion, collection, display, or component stages, install a required
  component such as Veritas, or choose the next WarmHub builder skill. Trigger phrases: "build
  something with WarmHub", "start a WarmHub project", "guide me through building a WarmHub repo",
  "WarmHub repo and app", "with Veritas", "what WarmHub builder
  stage is next".
---

# WarmHub Builder

## Objective

Coordinate the WarmHub builder journey. Capture intent, initialize the project-state manifest, choose
the project shape, and route to the next matching stage skill.

Stay thin as the coordinator. Do not design schemas, plan ingestion, scaffold repos, build apps,
install components, or package final artifacts inside this coordinator; invoke the matching stage
skill for that work when it is installed.

## Operating Rules

- Prefer the matching stage skill. If it is installed, route to it and let it do the work.
- If the user asked to build the project, do not stop after a paper handoff when the next stage
  skill is installed and the path is clear. Continue through installed stage skills in the same
  session until the requested artifact exists, verification blocks, or a real user decision is
  needed.
- If a matching stage skill is not installed yet, stop with a clear handoff prompt instead of
  inlining that stage.
- Use the runtime's user-input tool for decisions that change the path: `AskUserQuestion`,
  `request_user_input`, or an installed equivalent. Present the recommended option first, offer 2-4
  concrete choices with tradeoffs, and ask one question at a time. If no tool exists, ask a numbered
  plain-text question with the recommended default first.
- Initialize or update the manifest before handing off.
- Re-enter live WarmHub repo state through `discover-warmhub-repo` when the path starts from an
  existing repo.
- Use `connect-warmhub-app` when an app surface needs SDK, auth, one-fact probe, or attribution
  setup, or when an MCP-capable agent needs WarmHub access.
- For agent-native integration, compose `connect-warmhub-app` directly when the user only needs a
  global MCP connection; repo-specific work can connect after repo facts are available. MCP is a
  connection choice, not a project shape or a new builder stage.
- Keep private paths, tokens, local secrets, and dev-only commands out of generated project guidance.
- Do not mark a stage complete unless its stage-owned artifact exists and has a verification
  receipt. A local scaffold is not a completed WarmHub repo; a display over local export files is not
  completed WarmHub display unless the repo read path has been proven.
- When the request names a WarmHub component or runtime such as Veritas, treat that as a mandatory
  component dependency. Record it in the manifest, route through `veritas-design` first when the
  component affects modeling or writes, then route through `add-warmhub-component` before declaring
  the repo/display complete.

## Workflow

1. **Intake.** Capture the idea, audience, story goals, data sources, constraints, sensitivity, and
   desired first useful output.
2. **Choose a project shape.** Select exactly one:
   - `data-only`
   - `data+collect`
   - `data+display`
   - `data+collect+display`
   - `collect-on-existing-repo`
   - `display-on-existing-data`
3. **Initialize the manifest.** Create or update `.warmhub-builder/project-state.json` unless the
   user chooses another path.
4. **Route.** Use [routing.md](references/routing.md) to pick the next stage and the artifact it
   should consume.
5. **Handoff.** End with the standard next-step block from
   [manifest-and-handoff.md](references/manifest-and-handoff.md).

## Intake Questions

Ask only what is needed to choose the shape:

- Is there already a WarmHub repo, or are we creating one?
- Does the project collect new data from users, devices, forms, photos, scans, GPS, or offline field
  work?
- Does the project need a display, dashboard, notebook, API, or other read surface?
- Does an MCP-capable agent need direct WarmHub access?
- What is the first useful output: data-only, collect-only, display-only, or collect-and-display?
- Is the repo identity or data sensitivity public-safe, internal, private, or unknown?

## Stage Order

| Stage | Consumes | Produces |
| --- | --- | --- |
| `design-warmhub-repo` | intake and manifest | `RepoDesignSummary` in the manifest |
| `plan-warmhub-ingestion` | repo design, sources, optional collector needs | ingestion plan |
| `veritas-design` | repo design requiring reputation-weighted consensus | Veritas fit/design, proposition/source/oracle plan |
| `build-warmhub-repo` | ingestion plan for a new repo | scaffolded repo and verified ingest/QC path |
| `add-warmhub-component` | existing repo or built repo | component plan/package/health result |
| `discover-warmhub-repo` | existing `org/repo` | read-only repo fact summary |
| `connect-warmhub-app` | repo facts and app or MCP target | SDK/auth/probe/attribution substrate |
| `build-warmhub-collector` | manifest, repo facts, collection intent | mobile/write collection surface |
| `build-warmhub-display` | manifest, repo facts, display intent | read/display or analysis surface |

## Output Contract

Return:

- selected project shape and why
- manifest path and fields initialized or updated
- recommended next stage
- exact handoff prompt for the next stage
- alternatives only when they are valid for the selected shape
- blocking questions, or `none`

## Quality Gate

Before ending:

- The selected shape is one of the six canonical shapes.
- Known facts are written into the manifest or explicitly listed for the user to approve.
- The recommended next stage is named and valid for the selected shape.
- The coordinator has not performed downstream stage work.
- The answer ends with a next-step block.

## References

- [routing.md](references/routing.md) — shape selection and stage routing table.
- [manifest-and-handoff.md](references/manifest-and-handoff.md) — manifest skeleton and next-step
  block format.
- [repo-design-summary.md](references/repo-design-summary.md) — shared `repoDesignSummary` contract
  consumed by design, ingestion planning, repo build, collectors, and displays.

## Next steps

After intake and routing, choose the next move:

- **Design the repo** — `Use design-warmhub-repo with this manifest.`
- **Discover an existing repo** — `Use discover-warmhub-repo for this org/repo.`
- **Connect an app** — `Use connect-warmhub-app once repo facts and app target are known.`
