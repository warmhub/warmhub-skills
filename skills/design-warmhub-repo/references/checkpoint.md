# Convergence Checkpoint

This is the gate every entry path arrives at. Whether you came in through query-first (entry A), entities-first (entry B), pattern-match (entry C), or sources-first (entry D), your design is ready for adoption when these five questions all answer cleanly. Not before.

The same five questions also work as a **fault-localizer** on a populated graph: when read-side friction is surfacing, running the gates against the existing shapes tells you whether the friction is upstream (shape-level) or downstream (CLI / index / tooling). See [entry E (post-hoc-audit-first)](../entries/E-post-hoc-audit.md) for the workflow that uses this checkpoint in audit mode rather than gate mode.

The order matters: questions 1 and 2 can be retrofitted with effort; question 3 *cannot* be retrofitted because `about` is immutable; questions 4 and 5 are continuous discipline.

---

## Question 1 — Does every shape cite at least one question it serves?

**The test.** For each shape in your manifest, write down the question(s) the shape exists to answer. Use the format from [the question-catalog template](query-catalog-template.md) if you're producing one alongside; otherwise list the questions in the shape's description or in a sibling design doc.

Before authoring new shapes, reconcile against current conventions in this skill set and any existing
repo facts: standard provenance shapes (`IngestRecord`, `Assessment`), naming rules, cross-repo
linkage policy, and field-type vocabulary. If a standard shape already serves the question, reuse or
extend it instead of inventing a parallel one.

**What "passes" looks like.** Every shape can be tied to at least one question whose answer requires that shape's existence. Questions can be shared across shapes; shapes serving multiple questions are fine.

**What "fails" looks like.** A shape exists but you can't articulate which question becoming answerable depends on it. Common diagnosis: someone added the shape "in case we want to track this later" and the design is now carrying weight it isn't paying for.

**Recovery.** Defer the shape until the question is real. If the question is real but blocked by other missing pieces, document the blocker and let the question stay on the catalog as `[F]` (future) until enabling shapes land.

This is the **anti-sprawl gate**. It's the spirit of "shapes earn their existence" — see [`query-catalog-template.md`](query-catalog-template.md) for the exemplars (a literature-review wiki's pre-shape query north-star, and a defect-prevention atlas's 39-query catalog).

---

## Question 2 — Does every load-bearing question resolve as a graph traversal, in both directions?

This gate has two pass-states. **Gate 2a (design-time pass)** confirms the *design* encodes the right primitives for traversability. **Gate 2b (runtime-verified pass)** confirms that against populated data, the corresponding refs queries actually return the expected instances. A graph can be design-correct (2a) without being empirically verified (2b) — common for new shapes that haven't been populated yet, or for analytical layers whose substrate is loaded but consumer shapes are still empty.

A repo can ship at 2a + 2b-partial and remain alpha-stage. **Full 2b is required for adoption** on every load-bearing relationship — the design walk alone catches design-time errors, not ingest-time drift (a relationship can be designed-correct and still be populated as flat-string CSV by a buggy ingester).

### Gate 2a — Design-time pass (the four-direction test)

For each assertion shape that represents a relationship between two or more things, walk through:

1. **Subject side.** From the subject, can `wh thing about <subject>` (or `--resolve-collections`) return this assertion?
2. **Object side.** From the other endpoint, can the same query return this assertion? If the relationship has multiple endpoints, every endpoint must be queryable. **If an endpoint is in another repo**, reverse `wh thing about` is repo-local and returns 0 — so the object side must be a typed wref field verified with `wh thing refs --inbound`, not an `about`-Pair you expect to reverse-query. See [primitives.md § The four-direction test across a repo boundary](../../modeling-foundations/references/primitives.md).
3. **Aggregation.** Can `wh assertion list --shape <Foo>` find all assertions of this type without filtering by string fields?
4. **Derived rollups.** Do the questions you'll want to ask of *combinations* (e.g. "vents addressed by any workaround") fall out as multi-hop traversals, or do they require post-hoc set logic on flat fields?

**What 2a "passes" looks like.** Every load-bearing question for the assertion is a graph operation. The shape's `about` arity (single thing / Pair / Set / List) is whichever one makes all four directions work.

Run the same 2a walk on every `[F]` future-shape query in the question catalog. Record the eventual
arity as a future contract, for example `[F] DuplicateAssertion about Set<TicketProxy>`. Do not write
hedges like "Pair OR single-about plus field." If the write path cannot emit the chosen primitive
yet, follow the staged-key retreat in
[`primitives.md` § When the primitive cannot be emitted yet](../../modeling-foundations/references/primitives.md);
the graph remains alpha for queries that depend on that deferred edge.

**What 2a "fails" looks like.** One endpoint of a relationship is reachable as a wref via `about`; the other is encoded as a flat string field in the assertion's data. The relationship is invisible from that endpoint.

The script at [`build-warmhub-repo/scripts/verify-relationships.mjs`](../../build-warmhub-repo/scripts/verify-relationships.mjs) (invoked with `--dry-run`) performs the 2a walk deterministically: it inspects each shape's field declarations for `Wref`-named string-typed fields (the canonical `DuplicateAssertion` smell) and samples a few assertions to flag any string-valued `Wref` field whose value looks like a real wref (typed-wref/flat-string drift). The script reads from a live repo by default; pass `--manifest <path>` to feed it a JSON shape list offline.

### Gate 2b — Runtime-verified pass (empirical check against populated data)

For each relationship that passed 2a, confirm against populated data:

1. Sample N instances of one endpoint shape.
2. For each, attempt the four-direction queries (`wh thing about`, `wh thing refs --inbound`, `wh assertion list`).
3. Verify every direction returns the expected assertions when a pair instance exists.
4. Fail-loud on any direction returning empty for a known pair.

The script at [`build-warmhub-repo/scripts/verify-relationships.mjs`](../../build-warmhub-repo/scripts/verify-relationships.mjs) (run without `--dry-run`) performs the 2b walk for a populated repo. It samples assertions per shape, classifies each one's `aboutWref` (Pair / Set / List / single thing), then runs three independent reachability checks:

1. **`wh thing about <endpoint> --resolve-collections --shape <X> --all`** must return the assertion from every endpoint. This is the four-direction test on the about-target side. (For collection-targeted relationships, endpoints come from `wh thing view <aboutWref>`; for single-about, the endpoint is just the about-target.)
2. **`wh thing refs <endpoint> --inbound --all`** must return the collection thing (for Pair / Set / List relationships). This is the empirical typed-wref check from issue A2: a flat-string-encoded endpoint would silently miss this even if check 1 passes via aboutWref lookup. Different bug class.
3. **For every typed-wref field on the assertion's data**, the target reports the assertion via `wh thing refs <target> --inbound --all`. Catches the non-collection case: single-about shapes that carry typed wref fields in their data pointing at additional endpoints (e.g. `Violation` about `EnforcementCase` with `documentedByInspections: wref[]` — the about check covers `EnforcementCase`, this check covers each `Inspection`).

All three calls paginate via `--all` so high-degree endpoints don't false-fail. Suggested defaults: sample 10 instances per shape; pass-rate threshold 100% (arity bugs are not amenable to "most of them work"). **Cross-repo caveat:** for any relationship that crosses a repo boundary, the reverse check must use `wh thing refs --inbound` (cross-repo), never `wh thing about` (repo-local) — the latter false-fails at the boundary and would wrongly flag a correctly-designed typed-wref-field relationship. Default `--sample-size 10` is a smoke sample; raise it for higher-confidence runs.

**What 2b "passes" looks like.** For every load-bearing relationship, the four-direction queries return the expected assertions against real data. Empty shapes are flagged but don't fail 2b (they fail 2b-partial instead, which is acceptable at alpha).

**What 2b "fails" looks like.** A relationship passed 2a in the manifest, but ingested instances stored the relationship as a flat-string CSV anyway (the ingester drifted from the design). The four-direction queries are silent on the drift; only running them against real data exposes it.

### Recovery

This is the dangerous question — `about` is immutable. The recovery path is **retract the bad assertions and re-assert with the correct arity**. The retracted assertions remain in version history but are hidden from default queries. If you catch this before any data is loaded (clean 2a), change the shape design and proceed; if data is already loaded (failed 2b), plan a retract-and-replay migration with cascade through dependent assertions — see [`migrations.md`](../../build-warmhub-repo/references/migrations.md) for the discipline.

A `DuplicateAssertion` (`about: subjectWref` + `originalWref: string`) is the canonical failure of this gate. A `Resolution` (`about: "Pair/<name>"`, the Pair created by a prior named `kind:"collection"` op) is the canonical pass.

See [primitives.md § Traversability Contract](../../modeling-foundations/references/primitives.md) for the full rule.

---

## Question 3 — Are things, assertions, and collections used correctly per canonical primitives?

**The test.** Walk each shape and check:

- **Thing or assertion?** Per docs.warmhub.ai: things are entities with a single canonical state ("if there's one truth about this entity, it's a thing"); assertions are claims with attribution, confidence, or multiple perspectives. A lookup table is a thing; an agent's assessment is an assertion.
- **Collection where appropriate?** Symmetric relationship → `Set`. Directional 2-way → `Pair`. Variable-size with duplicates allowed → `List`. Single-target → no collection. A genuine ordered 3-way relation is not a collection primitive — model it as a named domain shape/assertion; mechanical 3-way grouping without ordering semantics can use `Set` or `List` instead.
- **Identifying data in the payload?** Even when `about` is set, the assertion's data should include enough identifying information to be self-describing without resolving the about target.
- **Atomic ops where create-then-assert is needed?** `about` targets must exist at commit time. Use `--ops` to create both the target thing and the assertion in one write.
- **BDU only on binary propositions.** Subjective-logic `(b, d, u, α)` opinions require true/false claims (binomial-opinion constraint per docs). For non-binary uncertainty, use a separate confidence-bearing assertion shape, not a BDU triple shoehorned onto a continuous concept. If multiple independent sources need reputation-weighted consensus over the same binary propositions, verify the design with [../../veritas-design/SKILL.md](../../veritas-design/SKILL.md) instead of hand-rolling fusion or trust weighting.
- **Field types use the pinned vocabulary.** Scalars are `string`, `number`, `boolean`, and `wref`; multi-valued fields use native array declarations; optional fields use the `?` suffix. Record any field form that is new to the project so the build stage can live-verify it before adoption. Local-green is not live-green.

**What "passes" looks like.** Each shape's choice of (thing vs assertion) and (single-target vs Pair / Set / List) is justified by the four-direction test. BDU appears only where binary propositions are being modeled.

**What "fails" looks like.** Static reference data (country codes, lookup categories) is being modeled as assertions when no one will ever ask "who said this?" Or: a continuous-relevance edge carries a BDU triple that nobody can interpret consistently.

**Recovery.** Wrong thing/assertion choice can usually be fixed by re-importing into the correct kind — relatively cheap. Wrong arity (see question 2) is expensive. Wrong BDU placement is cheap if caught early but permanent if data has accumulated under the bad model.

---

## Question 4 — Are the universal foundations applied?

**The test.** Skim
[`modeling-foundations/references/design-rules.md`](../../modeling-foundations/references/design-rules.md)
and confirm each rule applies to the design:

- Hierarchical names that encode stable identity, not mutable state and not provenance (no `Rank/1`, no `Claim/needs-review`, no loader/source/harness tag in the name). `/`-delimited so the hierarchy is visually navigable and glob-queryable by prefix; built by one authority so two producers describing the same entity compute the same name. Full treatment and checklist in [`naming.md`](naming.md).
- Every shape has a non-trivial `description`. Every field has a non-trivial `description`. `describeRepo` would teach a context-free agent how to ask correct questions about the graph.
- Append-only revision: status moves are reflected in certainty / basis / review events / decisions, not in deletion or mutation of prior assertions.
- No durable debt-shapes (`ReviewDebt`, `NeedsSupport`, `BestReviewTarget`). Those are queries.
- Where `about` is a Pair/Set/List, mirrored convenience fields (subject wref, object wref, kind, identity-key) are added onto the assertion for context-free reader legibility.
- Stale-verdict retraction discipline if your domain has expensive derivations (D3=expensive in `dimensions.md`): every derived verdict carries a content-addressed policy/mechanism wref so a policy change can retract affected verdicts cleanly.
- Verify-before-encoding: no shape encodes a belief about a platform mechanism (resolution scope, validation scope, field-type support, index behavior) that wasn't actually run. If a cross-repo relationship is in scope, the cross-repo reverse-traversal behavior was probed, not assumed. See [`design-rules.md` § Verify Platform Mechanisms Before Encoding](../../modeling-foundations/references/design-rules.md).
- Cross-repo linkage (if any relationship crosses a repo boundary): the link is a typed wref field on the join-key-owning side (not reverse `about`); no unresolved raw string sits in a wref-typed field; the unresolved-target policy and the target-retraction / identity-merge / stable-join-key prompts are answered. See [`cross-repo-linkage.md`](../../modeling-foundations/references/cross-repo-linkage.md).
- Snapshot absence policy: source feeds that omit rows have a documented policy based on snapshot character (full snapshot, active-only lagged feed, later-full snapshot, or immutable event stream). Absence does not silently become deletion or deactivation.
- Field-level shape design: for any shape carrying more than ~25 fields, or any shape on a >100K-instance population, walk the eight entity-discovery tells in [`field-level-design.md`](../../modeling-foundations/references/field-level-design.md) — hidden entities, twin-encoded fields, repeated clusters, sparse sub-entities, derived/time-relative rot, unparsed source strings, Y/N flags as strings, over-wide filter surface. The four-direction test catches relationship defects; the field-level audit catches entity defects. Both apply.

**What "passes" looks like.** Every foundation rule has been considered and either applied or explicitly overridden with a documented reason.

**What "fails" looks like.** "We didn't get to descriptions yet, we'll fill them in before adoption." This is exactly the failure mode that produces graphs no external agent can read. Descriptions are part of the shape definition, not documentation garnish.

---

## Question 5 — Have you walked the pitfalls for your fingerprint and the context-free reader contract?

**The test, part one — pitfalls.** Run [the dimensions diagnostic](../../modeling-foundations/references/dimensions.md) on your design (if you haven't already). Match a fingerprint in [the pattern catalog](pattern-catalog.md). Open [pitfalls.md](../../modeling-foundations/references/pitfalls.md) and read every entry whose dimension answers match yours. For each, confirm your design avoids the failure mode at the schema layer.

**The test, part two — context-free reader.** Encode three to five questions an external MCP agent should be able to answer about the graph using only `describeRepo`, `wh thing about`, `wh thing refs`, and `wh thing query`. Encode the expected exact answers. Run them. If any answer requires session memory or private project knowledge, the description coverage or the mirrored field set is incomplete.

[`context-free-reader-evals.md`](context-free-reader-evals.md) ships per-fingerprint templates: open the section matching your `pattern-catalog.md` match, fill in the placeholders with your project's specific wrefs/values, and execute the queries through `wh`. Cross-cutting questions in that file apply to every graph regardless of fingerprint.

If the graph is a join-target backbone or substrate repo, Gate 5 must also prove that a consumer can
identify which shape and key to join on, whether links are pinned or re-resolved, and how v1/v2 shape
transitions are disambiguated. A substrate that only its original author knows how to join is not
context-free.

**What "passes" looks like.** Every pitfall for your fingerprint is preempted by the schema. The context-free reader returns the expected exact answers without help.

**What "fails" looks like.** A pitfall fires (e.g., mechanism mismatch on a synthesize-and-test fingerprint, or terminal-adoption trap on a continuous-evidence domain). Or the context-free reader can't tell what the graph is for.

**Recovery.** Pitfalls are usually retrofittable at design time, expensive in production. The context-free reader contract is mostly a description-coverage problem and is fixable by editing the manifest.

---

## After the checkpoint

When all five questions pass:

- Your graph is ready for **alpha adoption** — load real data, run real queries, ship the first useful traversal.
- Watch for the failure modes in [pitfalls.md § Cross-Cutting Pitfalls](../../modeling-foundations/references/pitfalls.md): stale verdicts after deriver changes, context-free reader drift, shape-without-a-question creep.
- For domains with continuous external evidence (D6 in `dimensions.md`), **the falsifiability ledger is part of adoption, not optional.** Adopted assertions need a `LaterValidationSignal`-style continuous-evidence shape with adjudication slots. Without it, adoption is unfalsifiable.
- Before leaving alpha, run a bounded live write/readback through the actual ingestion path. The design checkpoint names the requirement; the build stage owns the operational details in [`build-warmhub-repo/SKILL.md`](../../build-warmhub-repo/SKILL.md) and [`operations-guide.md`](../../build-warmhub-repo/references/operations-guide.md).

If a question fails, you have two real options: fix the design before adoption (cheap, recommended), or document the gap and adopt with a known scope limit (sometimes necessary, but the limit must be in the graph as an explicit assertion, not in someone's head).

The skill's job ends here. The graph's life is just starting.
