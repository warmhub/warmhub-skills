# Migrations: Retract-and-Replay Discipline When `about` Is Immutable

This file applies when you have an existing populated WarmHub graph and you need to change something the immutable-`about` rule won't let you change in place. Three common triggers:

- **Arity change.** A relationship was modeled with `about: <single-thing>` and a flat string field for the other endpoint (the canonical "v1 anti-pattern" — see `../../modeling-foundations/references/pitfalls.md` § About-Target Arity Mismatch); the right design is `about: { set: [a, b] }` or `about: { pair: [a, b] }`.
- **Shape semantic change.** A v1 shape gets revised to mean something different, or split into two shapes; existing assertions targeting it now have the wrong target shape.
- **Subject swap.** A v1 design asserts about the wrong target (e.g. `about: Filing` when the navigation axis should have been `about: Company`); the new design points at a different thing.

In all three cases the v1 assertions can't be edited in place; they have to be **retracted and re-asserted** under the v2 design. And because every assertion's `about` is immutable, the retraction **cascades** through every dependent assertion targeting the retracted assertion.

This file is the discipline. It applies regardless of fingerprint.

If your graph has no production data yet, this file isn't for you — just delete and re-create. The discipline below is for populated graphs where the v1 data must be preserved in version history.

---

## The Four Moves

Per v1 thing migrated, apply all four:

### 1. Deterministic v2 names from canonical-sorted member wrefs

Hash the v2 assertion's `about` members (in canonical order — sorted for `Set`, ordered as-given for `Pair` / `Triple` / `List`) plus the v2 shape name. Derive the v2 wref from that hash. The wref must be identical on every re-run.

```
v2-wref = <ShapeName>/<prefix>-<short-hash>
where short-hash = sha256(canonicalize(members) + shapeName)[:N]
```

This makes the migration **idempotent**. A re-run sees the v2 assertion already exists (via `wh assertion view <v2-wref>`), skips the write, and the retract step is a no-op for already-retracted v1 assertions.

Avoid: timestamps, random ids, run-batch ids, environment-specific values, or anything else that varies across runs.

### 2. `migratedFrom` audit-trail field

Every v2 assertion (and every cascade-rewritten dependent) carries a `migratedFrom: <v1-wref>` field pointing at the assertion it replaces. The v1 assertion is retracted but stays visible in version history (`wh thing view <v1-wref> --include retracted`); `migratedFrom` makes the lineage explicit so future readers can trace why the v2 wref looks the way it does.

For the cascade — the rewritten CertaintyOpinion / ReviewEvent / Critique now pointing at the v2 assertion — `migratedFrom` points at the v1 dependent that originally targeted the retracted v1 assertion. Each cascade level preserves its own lineage.

### 3. Per-thing commits with pre-validated ops

Each v1 thing's full cascade — write v2 + cascade-rewrites, then retract v1 + dependents — lands in a **single `wh commit submit --ops` call**. Per-thing granularity is the right scope; per-migration atomicity (one commit for N things) is usually impractical at scale.

**Important caveat on atomicity.** `wh commit submit --ops` is **per-op validated, not per-commit atomic**. If one op in the array fails validation (missing required field, malformed wref, shape conformance violation), the *other ops in the same call may still apply* — and the exit code reflects the worst-case op, not the per-op outcome. Don't trust the commit-level success signal alone.

Discipline that follows from this:

- **Pre-validate every op in the array against the v2 shape contract before submitting.** Read the v2 shape definition; for every op, check that all required fields are present and types match. Catch the gap in your script, not in the backend's per-op rejection. (See "What Can Go Wrong" § new required v2 fields below — this is the most common cause of partial-apply.) A native `wh` validate primitive could catch this client-side, turning this discipline into a single CLI call rather than client-side reimplementation.
- **Verify post-commit state explicitly.** After `wh commit submit`, query `wh thing view <v2-wref>` and `wh assertion view <v1-wref>` to confirm the v2 thing exists and the v1 was retracted. Don't infer from the exit code.
- **Make the migration script idempotent at the thing level**, so a partial-apply on one thing can be re-run safely. Deterministic v2 names (Move 1) make this work — a second run sees the v2 exists, skips the write, and retries any retraction that didn't land.

### 4. Full retraction cascade

For each v1 assertion you retract, enumerate every assertion whose `about` targets it:

```bash
wh assertion list --about <v1-wref> --repo <repo>
```

For each dependent, **its own `about` is immutable too** — so it can't be re-targeted at the v2 assertion. Each must be:

1. Replicated as a v2 assertion targeting the v2 form, with `migratedFrom: <v1-dependent-wref>`.
2. Retracted in the same atomic commit.

The cascade can be multi-level: a CertaintyOpinion targets the v1 assertion; a Critique targets that CertaintyOpinion; a ReviewEvent targets that Critique. Recurse, with a cycle guard.

---

## Worked Example: A Symmetric-Relationship Arity Lift

Concrete case from a real production migration. Starting state (verified before migration):

- 1 v1 `DuplicateAssertion/dup-19101a0fcc30826d` with `about: TicketProxy/<A>` and `originalWref: "<B-wref>"` as a flat string field. (The v1 anti-pattern: relationship invisible from B's side.)
- 1 dependent `CertaintyOpinion/cert-19101a0fcc30826d` with `about: DuplicateAssertion/dup-19101a0fcc30826d` and BDU `(b: 0.7, d: 0.1, u: 0.2, a: 0.5)`.
- 1 dependent `ReviewEvent/rev-19101a0fcc30826d` with `about: DuplicateAssertion/dup-19101a0fcc30826d` and reviewer + note.

Single-thing migration emits **6 atomic ops** in one `wh commit submit --ops`:

```
1. add      DuplicateAssertion/dup-set-7c8b57255900e95f
            about: { set: [TicketProxy/<A>, TicketProxy/<B>] }
            data: { migratedFrom: "DuplicateAssertion/dup-19101a0fcc30826d", reason, members[] }

2. add      CertaintyOpinion/cert-set-7c8b57255900e95f
            about: DuplicateAssertion/dup-set-7c8b57255900e95f
            data: { b: 0.7, d: 0.1, u: 0.2, a: 0.5,
                    migratedFrom: "CertaintyOpinion/cert-19101a0fcc30826d" }

3. add      ReviewEvent/rev-set-7c8b57255900e95f
            about: DuplicateAssertion/dup-set-7c8b57255900e95f
            data: { reviewer, note, certaintyBefore, certaintyAfter,
                    migratedFrom: "ReviewEvent/rev-19101a0fcc30826d" }

4. retract  DuplicateAssertion/dup-19101a0fcc30826d
5. retract  CertaintyOpinion/cert-19101a0fcc30826d
6. retract  ReviewEvent/rev-19101a0fcc30826d
```

Order matters: writes first (so the v2 backrefs are live before any retract executes), retractions last. **`wh commit submit` is not all-or-nothing on validation failure** — pre-validate the entire ops array against the v2 shapes before submitting (see Move 3 above), and verify post-commit state by reading back, not by trusting the exit code. With idempotent v2 names (Move 1), a partial-apply on one thing is safe to re-run.

The hash `7c8b57255900e95f` is `sha256(sortedWrefs(A, B) + "DuplicateAssertion")[:16]`. Re-running the migration sees `DuplicateAssertion/dup-set-7c8b57255900e95f` already exists (`wh assertion view` returns the v2 assertion); the v1 assertion is already retracted; the entire 6-op block is a no-op.

---

## Shape Migration vs Data Migration

These should be **separate WarmHub commits**, in this order:

1. **Shape migration.** `wh shape create/revise` for any v2 shapes that don't yet exist or need updating. Lands as one or more shape-revision commits.
2. **Data migration.** The migration script reads v1 data and writes v2 data per the four moves above. Lands as N per-thing commits (one per migrated thing).

Why separate: if the shape commit succeeds but the data migration fails partway, the graph is in a clean partial state — v2 shapes exist with no v2 data, and the migration script can resume from where it stopped. If shape and data were merged, a partial failure would leave inconsistent shape-vs-data state that's harder to diagnose.

---

## Idempotency Verification

Before you trust your migration to land cleanly:

1. **Dry-run the migration twice in succession.** First run plans N writes and N retractions. Second run should plan **0 writes and 0 retractions**. If the second run plans non-zero ops, the deterministic-name derivation is leaking non-determinism — fix it before committing.
2. **Verify v2 name derivation is stable across machines / processes.** Hash with a stable algorithm (sha256 or similar) over a canonicalized representation; avoid system-time, random, environment, or memory-address inputs.
3. **Verify the cascade enumeration matches.** `wh assertion list --about <v1-wref>` before and after the dry-run should return the same set of dependents (the dry-run doesn't write anything).

---

## What Can Go Wrong

- **Non-deterministic v2 names.** Caused by version-pinning drift, unsorted `Set` members, or environmental inputs leaking into the hash. Symptom: re-runs write duplicate v2 assertions. Fix: canonicalize the version pinning of members before hashing (use `wh thing view <wref>` and pin to the returned version to lock to current HEAD), and sort `Set` members by wref string before hashing.
- **Multi-level cascade.** A CertaintyOpinion targets the v1 assertion; a Critique targets that CertaintyOpinion; a ReviewEvent targets that Critique. Recursion needs a cycle guard (rare in practice but not impossible).
- **Concurrent v1 writes during migration.** A new v1-pattern assertion gets written while the migration is running. The migration won't see it; it'll be left as v1 detritus. Mitigation: update the assertion-emitting scripts to v2 *before* running the migration so no new v1 things can be written, or run the migration in a loop until the v1 set is stable empty.
- **External tooling that filters retracted things.** The graph's retracted assertions are still visible via `--include retracted`, but tooling that doesn't pass that flag will see the v1 disappear and may be confused. Document the migration window; consumers may need to update their queries to reference v2 wrefs explicitly or to include retracted.
- **New required v2 fields + cascade-rewrite = partial-apply hazard** *(common; surfaced from real migrations)*. When a v2 shape adds fields that weren't on v1, the cascade-rewrite step (which copies v1 data verbatim onto the v2 form) produces v2 assertions missing the new required fields. The backend validates per-op and rejects the bad op — but the rest of the same `wh commit submit --ops` call may still apply, leaving partial state. Two mitigations applied together: **(a)** when revising a shape with v1 data in flight, mark genuinely-optional new fields as optional (`?` suffix in WarmHub shape syntax) rather than required; **(b)** have the migration script's cascade-rewrite explicitly inject sensible defaults for any v2 field not present in v1. Don't rely on backend rejection to catch the gap — by the time it rejects, partial state has landed.
- **`wh commit submit` is per-op-validated, not per-commit-atomic** *(surprising; surfaced from real migrations)*. A validation failure on one op does **not** roll back the other ops in the same commit. The exit code reflects the worst-case op, not the per-op outcome. Mitigation: pre-validate every op in the array against the v2 shape contract before submitting `wh commit submit`; verify post-commit state by reading back with `wh thing view` / `wh assertion view`; don't trust the exit code. Idempotent v2 names (Move 1) make per-thing re-runs safe when partial-apply happens. A native `wh ops validate` primitive could catch this client-side.
- **`whlr:` locator URIs after referenced-shape revisions** *(surfaced from real migrations)*. When a thing or assertion references something whose shape has been revised, the wref may come back as an opaque `whlr:UUID` form rather than the canonical name. The CLI rejects `whlr:` URIs in most contexts except `wh thing refs --outbound`. Migration scripts that read v1 data with refs to shape-revised things must resolve the UUIDs via `wh thing refs --outbound <wref>` before using them in new ops; failing to do so produces ops that the backend rejects as malformed.

---

## Anti-Patterns

- **Mutating `about` directly via `wh assertion revise`.** The backend rejects; `about` is immutable. The discipline is to never even try.
- **Re-targeting dependents by writing a new `about` to them.** Same constraint — every assertion's `about` is immutable, including for the cascade-dependent assertions.
- **Non-deterministic v2 names** (timestamps, random ids, run-batch ids, sequence numbers in the v2 wref). Re-runs duplicate. Always derive from canonical-sorted members + shape name.
- **Skipping the cascade retraction.** Leaves dependents pointing at retracted v1 assertions. The dependents' BDU / review history is now anchored to retracted state; queries that walk the cascade get stale answers. Always retract dependents in the same atomic commit.
- **Merging shape and data migration into one commit.** If the data migration fails partway, you can't tell whether the shape is in a useable state. Keep them as separate atoms.

---

## A Migration Script Skeleton

The shape of a runnable migration:

```typescript
// scripts/migrate-v1-to-v2.ts
import { sha256, sortedWrefs } from "./_helpers";

const DRY_RUN = process.argv.includes("--dry-run");
const COMMIT  = process.argv.includes("--commit");

if (!DRY_RUN && !COMMIT) {
  console.error("specify --dry-run or --commit");
  process.exit(1);
}

const v1Assertions = await wh.assertion.list({ shape: "DuplicateAssertion", repo });

for (const v1 of v1Assertions) {
  // Skip already-migrated things (the v1 about is the single-thing form;
  // the v2 form has about: { set: [...] }).
  if (isV2Arity(v1.about)) continue;

  // Reconstruct v2 members from v1 about + flat originalWref field.
  const members = sortedWrefs([v1.about, v1.data.originalWref]);
  const v2Hash = sha256(members.join(",") + "DuplicateAssertion").slice(0, 16);
  const v2Wref = `DuplicateAssertion/dup-set-${v2Hash}`;

  // Idempotency: skip if v2 already exists.
  if (await wh.assertion.exists(v2Wref)) continue;

  // Enumerate dependents to cascade.
  const dependents = await wh.assertion.list({ about: v1.wref });
  const ops = [
    addOp(v2Wref, members, { migratedFrom: v1.wref, ...v1.data }),
    ...dependents.map(d => addOp(deriveV2Dep(d, v2Wref), v2Wref, {
      ...d.data, migratedFrom: d.wref,
    })),
    retractOp(v1.wref),
    ...dependents.map(d => retractOp(d.wref)),
  ];

  if (DRY_RUN) {
    console.log(`would emit ${ops.length} ops for ${v1.wref}:`, ops);
  } else {
    await wh.commit.create({ ops, message: `Migrate ${v1.wref} → ${v2Wref}` });
  }
}
```

This is a sketch. Real migrations will need: cycle-guarded recursion for multi-level cascades, batching to limit per-commit op count if a single thing's cascade exceeds the WarmHub commit-size limit, and per-thing error handling that doesn't leave partial state.

---

## When You Don't Need This Discipline

- **Greenfield graphs** with no production data. Just delete and re-create the v1 shapes; this whole file is for after-the-fact recovery on populated graphs.
- **Additive shape changes** (adding new shapes, adding optional fields to existing shapes). These don't conflict with `about`-immutability and don't need migration.
- **Pure data corrections** that don't change `about` or shape semantics — e.g. fixing a typo in a description field. Use `wh assertion revise` directly; data fields are mutable, only `about` and identity are immutable.

---

## Cross-references

- `../../modeling-foundations/references/pitfalls.md` § About-Target Arity Mismatch — the design-time detection of the v1 anti-pattern that creates the need for this discipline.
- `../../modeling-foundations/references/primitives.md` § The Traversability Contract / The `about` Field is Immutable — the underlying constraint.
- `../../modeling-foundations/references/design-rules.md` § Stale-Verdict Retraction Discipline — the related rule for content-addressed-policy verdicts in expensive-derivation graphs (which is also a retract-and-replay pattern, just driven by policy change rather than shape change).
- `../../design-warmhub-repo/evals/test-prompts.md` Prompt 1 (project tickets) — the canonical domain that produced this discipline through a real v1→v2 lift.
