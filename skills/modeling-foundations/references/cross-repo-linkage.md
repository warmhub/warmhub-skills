# Cross-Repo Linkage

When a relationship crosses a repo boundary, the design rules are different from an in-repo relationship — and the differences are easy to get wrong, because reverse `about` *silently* returns nothing across repos (see [`primitives.md` § The four-direction test across a repo boundary](primitives.md)). This file is the consolidated decision aid: the linkage checklist, plus the lifecycle prompts a cross-repo design has to answer that an in-repo design never raises.

Read it whenever a relationship's two endpoints live (or will live) in different repos — a consumer repo referencing a shared identity substrate, an analytical layer over an upstream catalog, any host-resolved link. The shape pattern itself is [`pattern-catalog.md` § 12 — Cross-Repo Substrate-Split](../../design-warmhub-repo/references/pattern-catalog.md); this file is the *design discipline* that pattern assumes.

---

## The linkage checklist

1. **One side owns the explicit wref; the other gets reverse navigation for free.** Put the typed wref field on the side that owns the stable **join key** — usually the high-volume consumer referencing the stable substrate. The substrate side needs *no* reciprocal field: `wh thing refs --inbound` fans out across repos and surfaces the consumer's links from the substrate side. Do not add a second wref on the substrate "so it can find its consumers" — that inverts the dependency and forces the foundation to churn on consumer activity. (If the link is **multi-valued** — one consumer thing references N substrate targets — use a native **wref array**; each member is independently reverse-traversable cross-repo via `refs --inbound`. See [`field-level-design.md` § Multi-valued fields](field-level-design.md).)

2. **Use a typed wref field, never an `about`-Arc or `about`-Bond you expect to reverse-query.** Across a repo boundary, reverse `about` is repo-local and returns `0`. A typed wref field is the only reverse-traversable cross-repo construction. (The *why* is in the [primitives boundary note](primitives.md); don't re-derive it here — and don't assume it, [probe it](design-rules.md) if your platform version might differ.)

3. **Never publish an unresolved string in a wref-typed field.** A wref-typed field holds a *resolved* wref or is absent — nothing else. If the join key hasn't been resolved to a target yet, keep the raw key in a separate plain-string field (`<x>RawKey`) and leave the wref field unset. A wref-typed field carrying a string that doesn't resolve poisons the refs index and lies to every reader and traversal that trusts the type.

4. **Declare the unresolved-target policy up front.** Cross-repo resolution is often asynchronous — the link intent is declared, then a host resolver lands the wref later. Decide and write into the field's description, *before* shipping the shape:
   - Is the wref field optional (`wref?`) because resolution is pending/async?
   - Where does the raw join key live while unresolved (the `<x>RawKey` field above)?
   - Who resolves it — a host batch resolver, ingest, a manual pass — and what's the pending state in between?
   - How does a reader landing on an unresolved instance tell "not linked yet" from "intentionally has no link"?

5. **Pin or float — on purpose.** Cross-repo wrefs auto-pin to the target version that existed at write time, so a consumer query reads a frozen substrate view. Decide whether that pinned snapshot is what you want (stable, reproducible) or whether you need to re-resolve to HEAD (track substrate revisions), and document the choice. Silent pinning that nobody decided is a latent surprise when the substrate revises.

6. **Make the wref field self-describing for a context-free reader.** A reader who has only the linking thing — not the source repo, not your project context — must still interpret the field. The field description names the target shape, states the join-key semantics, and states the unresolved policy. Verify with the cross-repo reader evals (Q5.6–Q5.7 in [`context-free-reader-evals.md`](../../design-warmhub-repo/references/context-free-reader-evals.md)).

## Identity handoff: id-hint now, typed edge later

Sometimes the source can emit a stable foreign key before the target repo or resolver can emit a
typed wref. That interim is legitimate only when it is explicit and inert:

1. **Intent is recorded.** The field description says this is a pending cross-repo handoff, not a
   traversable edge. Name it like `facilityRawKey` or `facilityIdHint`, not `facilityWref`.
2. **Payload is inert.** The hint carries no credential, token, private locator, or host-only lookup
   secret. It is a public or source-authorized join key that a later resolver can use.
3. **Resolved links are absolute.** When the target is known, write a full `wh:org/repo/Shape/name`
   wref (letting the platform pin it) or an explicit pinned wref if the workflow requires a fixed
   version. Do not write repo-local shorthand for cross-repo targets.
4. **Re-resolution is scheduled.** The ingestion plan names the resolver pass, cadence, and failure
   policy. Pending hints have an observable count; a graph with unresolved links that nobody can count
   is not adoption-ready.

The difference between this and the arity-mismatch anti-pattern is intent plus migration trigger. A
plain string endpoint that readers must join on forever is a failed graph edge. A raw key with a
documented resolver, optional `wref?` target, and deterministic backfill path is a staged write-path
compromise.

---

## Lifecycle & orphan policy prompts

A cross-repo link is a dependency that outlives the moment it was written, and the target is governed by *another repo* you don't control. Append-only revision means links never silently update — so the consequences below are design decisions, not runtime conveniences. Answer these at design time; a graph that hasn't is carrying undocumented orphan risk.

- **Target retraction.** When a linked thing is retracted in the substrate, what happens to inbound cross-repo wref fields? They do **not** auto-update — a pinned wref still resolves to that version's history, and a float-to-HEAD wref now dangles. Decide: does the consumer run a periodic dangling-link check (`refs`/`wref resolve`)? Re-resolve to a successor? Deliberately keep the pinned historical view? Whatever the answer, it's a documented policy, not a discovered surprise.

- **Identity merge.** When two target things merge into one identity, inbound links to the losing identity must be redirected — they won't follow the merge on their own. Decide the merge policy: publish a redirect/alias the consumer can follow, re-resolve affected consumers, or retract-and-replay the link assertions. Links are immutable-target dependents, so a merge is a **retract-and-replay cascade** — see [`migrations.md`](../../build-warmhub-repo/references/migrations.md) for the cascade discipline (the links are the dependents being cascaded).

- **Stable join key vs churning identifier.** Which field is the durable join key — survives re-ingest, is never reused for a different entity — versus a churning identifier (a display id, a sequence number, a mutable slug)? **Link only on stable join keys.** A wref built on a churning id rots the moment the id is reassigned. This is the cross-repo face of deterministic-from-a-stable-seed naming ([`naming.md`](../../design-warmhub-repo/references/naming.md)) and the stable-identity tell ([`field-level-design.md`](field-level-design.md) § Tell 1).

- **Unresolved-link volume.** At scale, how many links sit unresolved at any time, and is that count observable? If resolution is async, pending state is first-class: a graph where 30% of links are silently unresolved and nobody can see it is failing quietly.

> **Coordination note.** *How much* a recompute or a target change costs — a cheap `revise`, an instance-level retract-replay, or a full dependent cascade — is the **recompute cost ladder** in [`design-rules.md` § The recompute cost ladder](design-rules.md). This section owns the cross-repo design-time **prompts** (what policy must exist); the ladder owns the change-type → tier → cost mapping. Read them together when a target changes.

---

## Where this connects

| Concern | Lives in |
|---|---|
| *Why* reverse `about` won't traverse cross-repo | [`primitives.md`](primitives.md) § The four-direction test across a repo boundary |
| The two-repo shape pattern (substrate + consumer) | [`pattern-catalog.md`](../../design-warmhub-repo/references/pattern-catalog.md) § 12 |
| Verifying the platform actually behaves this way | [`design-rules.md`](design-rules.md) § Verify Platform Mechanisms Before Encoding |
| Migrating links when a target changes (cascade) | [`migrations.md`](../../build-warmhub-repo/references/migrations.md) |
| Stable join keys / deterministic naming | [`naming.md`](../../design-warmhub-repo/references/naming.md), [`field-level-design.md`](field-level-design.md) |
| Context-free reader interpreting a cross-repo field | [`context-free-reader-evals.md`](../../design-warmhub-repo/references/context-free-reader-evals.md) Q5.6–Q5.7 |
