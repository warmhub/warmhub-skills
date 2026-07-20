# Entry D — Sources-First Design

> **Best when.** Most or all assertion-targets are external (papers, tickets, code commits, services, runs, transcripts). Identity-stability is the dominant first concern: if the source identity isn't right, nothing downstream is. The graph's job is to assert *about* external things, not to own their bytes.
>
> **Real risk.** Doesn't generalize when sources are graph-internal — you'll stall when you need to model synthesized objects (hypotheses, themes, decisions) that the graph itself produces. Can stop at proxy modeling without reaching the assertion design — you'll have beautiful identity infrastructure and no claims to make about it.

---

## The principle

Start by modeling **external source identity** as graph-internal proxies. Get the proxy shapes right (stable, well-named, identity-by-canonical-key), load some real data, and *only then* start designing the assertions you'll make about those proxies. Identity is the foundation; assertions are the value.

This entry suits domains where the question "what *is* this thing, exactly?" is the hardest one — papers with multiple aliases, code commits whose paths drift, tickets that get reorganized, services whose names change. Pin the identity; everything else builds on it.

The canonical phrase that captures this:

> **WarmHub asserts about stable source identities, not owned source copies.** A paper can be identified by arXiv/DOI/URL; a wiki file or summary can be identified by repo, commit SHA, path, and optionally blob/tree SHA. The graph composes beliefs about things, while source stores remain the authority for bytes.

Several real WarmHub repos started here: a ticket-analysis graph, a literature-review research wiki whose underlying graph proxies external papers, and a reusable research-arc foundation. Each settled the proxy layer first, then layered assertions on top.

## Workflow

### 1. Enumerate the external source families

What external systems hold the bytes you'll be asserting about? Common categories:

| External source family | Stable identity |
|---|---|
| Academic papers | arXiv ID, DOI, Semantic Scholar ID, canonical URL |
| Git artifacts | repo + commit SHA + path; optional blob SHA, tree SHA |
| Issue tracker tickets / pull requests | source system + project + number |
| Tickets | ticket-id from the source system (Zendesk, Linear, Jira) |
| Services / deployments | cluster + namespace + name; deployment events by SHA + actor + timestamp |
| Transcripts / runs / logs | run-id + actor + timestamp |
| Generic URLs | canonical URL + capture timestamp |

For each family, write down the stable identity components. The components should be:

- Available without making the graph the authoritative store for the bytes.
- Stable across the source system's normal evolution.
- Sufficient to disambiguate (no two different things produce the same identity).

### 2. Define the proxy shapes

For each source family, define a thing-shape (not assertion-shape) whose identity captures the stable key:

- `ExternalSourceReference/arxiv/<id>` for arXiv papers.
- `GitFileRevision/<commit>/<path>` for code at a specific revision.
- `TicketProxy/<system>/<project>/<number>` and `PullRequestProxy/<system>/<project>/<number>` for repository-hosted work items.
- `ServiceProxy/<cluster>/<ns>/<name>` for services.
- `TicketProxy/<system>/<id>` for tickets.

These are **things**, not assertions — they have a single canonical state (the source's identity). They're *also* never the authoritative store for the source bytes; if you find yourself adding fields like `body: string` for a ticket's full text, pause and ask whether that body is authoritatively yours (it's not).

What goes on the proxy: the stable identity components, plus a small set of source-derived fields useful for disambiguation (title, author, timestamp). What doesn't: the full content; full revision history that the source already has; anything that mutates faster than you can re-ingest.

### 3. Identify what assertions you'll make about the proxies

Now the entry diverges from pure source modeling. With proxies in place, what claims, classifications, or relationships will the graph add?

- **Single-target assertions** about one proxy ("this paper is about topic X", "this ticket is severity high in our judgment").
- **Arc-target assertions** between two proxies ("this PR fixes that issue", "this paper supersedes that one").
- **Bond-target assertions** for symmetric binary relationships ("these tickets are duplicates of each other").
- **Set-target assertions** for symmetric or n-way grouping.
- **Cross-source assertions** linking proxies from different source families ("this commit addresses this ticket").

Read [primitives.md](../../modeling-foundations/references/primitives.md) before continuing. The four-direction test must pass for every assertion shape; the arity choice (single thing / Arc / Bond / Set / List) is permanent because `about` is immutable.

Before promising a cross-source edge, run the join-feasibility check:

- A license-clean crosswalk or resolver exists, or the source owner allows you to derive one.
- The join key is time-durable for the row's historical meaning. Display identifiers, mutable tickers,
  renamed service slugs, and recycled external ids are not durable unless paired with an effective
  date or source-version key.
- Missing joins are representable as `[M]` blocked-on-data in the query catalog, not hidden as empty
  strings or fake "unknown" targets.
- If the edge crosses a repo boundary, the target side follows
  [`cross-repo-linkage.md`](../../modeling-foundations/references/cross-repo-linkage.md): raw key while
  unresolved, optional typed wref after resolution, absolute wref when resolved, and scheduled
  re-resolution if the substrate changes.

### 4. Add identity-receipt shapes if your ingestion needs them

For domains where source identity is itself contested (e.g., "is this paper the arXiv version or the Semantic Scholar version of the same thing?"), add a `SourceIdentityAudit`-style assertion shape that records ingestion-time disambiguation work. This is the receipt: "we resolved alias X to canonical Y because Z."

### 5. Now design the assertion content

Only at this step do you start designing the *interesting* assertions — claims, hypotheses, decisions, certainty opinions, evidence chains. Each one targets one or more proxies via `about`. The proxy infrastructure from steps 1–4 is the substrate; the assertions are where the graph earns its complexity.

For each new assertion shape, write down 1–3 questions it must enable. If the question requires field-string-match (e.g., "find all duplicates of issue X" using a flat `originalWref: string` field), the `about` arity is wrong. Use Arc / Bond / Set / List per primitives.md.

### 6. Diagnose the dimensions

Run [dimensions.md](../../modeling-foundations/references/dimensions.md). For sources-first designs, D1 is `external` by construction (that's why you're here). The other dimensions still matter.

In particular: D2 (object origination) reveals whether the graph is purely consumer (D2=pre-existing) or also synthesizes objects from the proxies (D2=both). If you find yourself wanting to make assertions about objects the *graph itself* produced (themes derived from clusters, hypotheses synthesized from issue patterns), entry D handles the proxy half well but you'll need to extend with synthesize-and-test patterns from the catalog for the synthesis half.

### 7. Match a fingerprint, walk pitfalls, reach the checkpoint

Open [pattern-catalog.md](../references/pattern-catalog.md). Several entries match domains that start sources-first: literature-review, ops state-tracking, pattern-mining atlas, external-proxy analysis. Pick the closest. Walk [pitfalls.md](../../modeling-foundations/references/pitfalls.md). Reach [checkpoint.md](../references/checkpoint.md).

## What this entry buys you

- **Identity discipline by construction.** Spending the first day on stable-identity proxies forces you to confront ambiguity early — when it's cheap to fix.
- **Natural separation of substrate and value.** Proxies are the substrate; assertions are the value. The two layers are visually distinct in the manifest, which makes review and onboarding easier.
- **Cross-source composability for free.** Once you have proxies for several source families, asserting *across* them (e.g., a ClaimBasis Arc from `ReviewedClaim` to `ExternalSourceReference`) is a small extension, not a redesign.

## What this entry costs you

- **Stalls if sources are graph-internal.** Proposals, hypotheses, decisions, themes — these don't have an external source. If your domain is dominated by graph-internal objects, entry D will leave you stuck after step 4.
- **Risk of over-modeling proxies.** It's tempting to keep adding fields to proxies "for completeness." Resist; only add what's needed for downstream assertions.
- **Risk of stopping too early.** Beautiful proxy infrastructure with no assertions is not a useful graph. Move past step 5 even if your proxies feel "not quite done yet."

## When to switch entries mid-stream

If step 5 (designing assertion content) is hard because you don't yet know what claims you'll make, switch to **entry A (query-first)** for the assertion layer. Sources-first handles the proxies; query-first handles what you'll assert about them.

If your domain is mostly graph-internal (proposals, hypotheses, themes), entry D is the wrong starting point. Switch to **entry B (entities-first)** or **entry C (pattern-match)** with a fingerprint that suits graph-internal origination (governance, multi-persona deliberative synthesis, knowledge-accumulation).

If you reach step 4 and find yourself inventing complex `SourceIdentityAudit` shapes for ambiguity that may never actually arise, defer them. Add them when ambiguity actually causes pain.

---

## Next

After completing the workflow above, all paths converge at [references/checkpoint.md](../references/checkpoint.md). Sources-first designs typically pass question 1 (shapes earn their existence) cleanly for the proxy layer but need the audit pass for the assertion layer — make sure step 5's per-assertion question discipline was real.
