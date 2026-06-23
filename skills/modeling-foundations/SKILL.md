---
name: modeling-foundations
description: >
  Apply WarmHub repo-modeling foundations before design, build, or review work. Use when choosing
  things versus assertions, selecting assertion about-cardinality (single thing, Pair, Triple, Set,
  List), running the four-direction traversability test, checking universal shape rules, classifying
  domain pressure, or walking modeling pitfalls. Trigger phrases: "WarmHub modeling foundations",
  "four-direction test", "about cardinality", "traversability", "things versus assertions".
---

# Modeling Foundations

## Objective

Give WarmHub builder stages the shared modeling rigor they need without re-importing the old
monolithic repo-design skill.

Use this as a capability from `design-warmhub-repo`, `build-warmhub-repo`, and review work. If it is
not installed, the consuming stage should run the smallest local fallback required for its own gate.

## Workflow

1. Read the project goal, source shape, existing repo facts, or proposed `RepoDesignSummary`.
2. Use [references/primitives.md](references/primitives.md) before finalizing any thing/assertion
   decision, `about` cardinality, or four-direction traversal result.
3. Use [references/design-rules.md](references/design-rules.md) for universal naming, descriptions,
   durable-vs-derived choices, source ownership, append-only revision, and context-free legibility.
4. Use [references/dimensions.md](references/dimensions.md) when the domain pressure is unclear or
   when a pattern transplant feels tempting.
5. Use [references/cross-repo-linkage.md](references/cross-repo-linkage.md) for any relationship
   whose endpoints may live in different repos.
6. Use [references/field-level-design.md](references/field-level-design.md) when a shape is wide,
   high-volume, source-flattened, or likely hiding sub-entities.
7. Use [references/pitfalls.md](references/pitfalls.md) at decision points that involve cardinality,
   identity, provenance, materialization, QC, or adoption.
8. Return the modeling decisions, unresolved blockers, and which downstream stage owns the next
   action.

## Output Shape

Return:

- thing-vs-assertion decisions and rationale
- per-assertion `aboutCardinality`
- four-direction result for every assertion shape: subject side, object side, aggregation, derived
  rollup
- domain fingerprint summary when relevant
- foundations or pitfalls applied
- blockers that must go back to `design-warmhub-repo`, `plan-warmhub-ingestion`, or
  `build-warmhub-repo`

## Success Criteria

- No relationship assertion leaves one endpoint as a flat string when graph traversal is required.
- Every assertion shape has an explicit about-cardinality decision.
- Every load-bearing relationship passes the four-direction test or is marked blocked.
- Universal foundations are applied or explicitly overridden with rationale.
- Provenance/QC pitfalls are routed to ingestion planning instead of hidden inside repo design.
- The answer ends with a next-step block.

## References

- [primitives.md](references/primitives.md) — things, assertions, collections, `about`
  cardinality, and the four-direction test.
- [design-rules.md](references/design-rules.md) — universal modeling rules.
- [dimensions.md](references/dimensions.md) — classifier for domain pressure.
- [cross-repo-linkage.md](references/cross-repo-linkage.md) — cross-repo wref design checklist.
- [field-level-design.md](references/field-level-design.md) — entity-discovery audit for wide or
  flattened shapes.
- [pitfalls.md](references/pitfalls.md) — failure modes and owning stages.

## Next steps

After foundation review, choose the next move:

- **Design repo** — `Use design-warmhub-repo to record the approved RepoDesignSummary.`
- **Revise design** — fix any blocked cardinality, identity, or traversal decision.
- **Plan ingestion** — `Use plan-warmhub-ingestion for source mapping, provenance, QC, and cadence.`
- **Verify build** — `Use build-warmhub-repo and run the relationship verifier after shapes exist.`

End with:

```text
Next step:
- Recommended: <one next stage or action>
- Alternatives: <short list of valid next stages/actions>
- Manifest updated: <path or not updated>
- Ready for: <stage-name or human decision>
- Blocking questions: <none or concise list>
```
