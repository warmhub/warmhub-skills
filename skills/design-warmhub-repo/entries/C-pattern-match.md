# Entry C — Pattern-Match Design

> **Best when.** Domain clearly resembles an existing successful WarmHub repo. Team has bandwidth for translation work (renaming and adapting, not just copying). You want to inherit hard-won design lessons without re-deriving them.
>
> **Real risk.** Cargo-cult — copying shapes whose original purpose doesn't apply to your domain. Transplant misfit — the source repo's fingerprint doesn't match yours and the shape vocabulary leaks the wrong assumptions. Vocab leakage — domain-natural names accidentally suggest the wrong fingerprint to context-free readers (see `pitfalls.md` § Vocabulary Leakage).

---

## The principle

Find a successful WarmHub repo whose domain is structurally similar to yours. Adopt its shape vocabulary, naming conventions, and traversal patterns. Translate names to your domain's nouns. Audit the result against the convergence checkpoint.

This is the discipline-by-precedent entry. Someone else already paid the design tuition; you inherit it. The risk is inheriting design choices that don't match your fingerprint — which is why this entry ends with a *contrast* check, not just a translation.

## Workflow

### 1. Identify candidate analogs

Open [pattern-catalog.md](../references/pattern-catalog.md) and skim the entries. For each, ask: "is my domain structurally like this?" Be skeptical — superficial similarity (e.g., "I'm tracking issues, a vent-tracker tracks vents, they must be alike") is exactly how cargo-cult happens.

The catalog entries (illustrative names — yours will differ):

| Catalog entry | Structurally suits when… |
|---|---|
| Literature-review graph | Curating claims drawn from external authoritative sources; single-author review; terminal adoption |
| Synthesize-and-test atlas | Graph synthesizes runnable artifacts deployed elsewhere; expensive derivation; continuous post-adoption evidence |
| Governance / proposal-ratification | Internal proposals with versions, votes, ratification, compliance signals |
| Operational state-tracking | Live external entities (services, deployments, flags); continuous telemetry |
| Pattern-mining atlas | External corpus (tickets, transcripts) clustered into themes; recommendations derived from clusters |

Pick the one closest to your domain. If two are close, you're likely a hybrid (see entry C *plus* layered co-fingerprints in pattern-catalog.md).

### 2. Read the analog's "where it fails when transplanted" section

Every catalog entry has a "where it fails when transplanted" paragraph naming the failure modes when the entry is *misapplied to a different domain*. Read this before adopting. If your domain matches any of the misapplication risks, the analog is the wrong one — go back to step 1.

This step is the difference between pattern-match and cargo-cult.

**Precedent is not a recipe.** "The sibling repo already chose this" is evidence, not permission to
skip entry C. A sibling design can be right for its source cadence, write path, and lifecycle while
being wrong for yours. Re-run the dimensions, question catalog, field-type, and four-direction tests
against the destination repo.

### 3. Read primitives.md before adopting any vocabulary

Read [primitives.md](../../modeling-foundations/references/primitives.md). Every shape you're about to translate uses Things, Assertions, and Collections — and the arity choices in the source repo were made for that repo's question set. Don't carry them over without re-running the four-direction test for *your* questions.

In particular: if the source repo targets a Pair (`about: "Pair/<name>"` referencing a named collection op) for some relationship, ask whether *your* version of that relationship is also directional. If not, change Pair to Set before any data lands. `about` is immutable.

### 4. Translate vocabulary, not concepts

Walk the source manifest. For each shape:

- **Translate the name** to your domain's noun. The literature-review pattern's `ReviewedClaim` becomes, in a defect-tracking domain, `AttributionHypothesis` or `DefectClaim` — not `ReviewedClaim/<defect-id>`. Domain-natural names matter for readability and for avoiding vocab leakage.
- **Translate the description** to your domain's vocabulary. Do not paste the source description and search-replace.
- **Audit the field set.** Some fields will be load-bearing in your domain (keep them); some were specific to the source domain (drop them); some need new fields you didn't anticipate (add them).

### 5. Run the vocabulary-leakage check

After translation, do a fresh-eyes read of the shape names alone. Ask: "if a context-free reader saw only these names — no descriptions, no project context — what fingerprint would they infer?"

If the inferred fingerprint differs from your actual fingerprint, the names are leaking the wrong assumption. Common leakages:

- Names like `Seat`, `Decision`, `Vote`, `Ratification` suggest governance, even if your domain is multi-persona research synthesis.
- Names like `Run`, `Event`, `Snapshot` suggest ops-state-tracking, even if your domain is synthesize-and-test.
- Names like `Claim`, `Reviewed*`, `Basis` suggest literature curation, even if your domain is experimentation.

Rename until the names suggest the right fingerprint. This is cheap at design time and expensive after data loads.

### 6. Diagnose the dimensions explicitly

Run [dimensions.md](../../modeling-foundations/references/dimensions.md). Compare your answers to the analog's fingerprint (named in pattern-catalog.md). Where they differ, the analog's design choices may not apply.

For example, if the source repo is `D6: continuous` (continuous external evidence post-adoption) but your domain is `D6: terminal`, you can drop the continuous-evidence shapes (`LaterValidationSignal`-style). Conversely, if your D6 is continuous and the source's was terminal, you need to *add* continuous-evidence shapes the source didn't have.

### 7. Walk pitfalls and reach the checkpoint

Read [pitfalls.md](../../modeling-foundations/references/pitfalls.md). For pattern-match entries specifically, read § Vocabulary Leakage carefully. Then walk [checkpoint.md](../references/checkpoint.md).

## What this entry buys you

- **Fast.** Translating from a known-good design is faster than greenfield design.
- **Inherits hard-won lessons.** The source repo's design choices already encode lessons learned in its domain. You inherit those for free if the fingerprints match.
- **Lower invention cost.** You don't have to re-derive structural patterns (review event vs critique, Pair vs Set, etc.).

## What this entry costs you

- **Cargo-cult risk.** Step 2 (read "where it fails") is the safeguard. Skip it and you'll inherit shapes whose justification doesn't apply to your domain.
- **Translation effort.** Renaming is mechanical but tedious. Domain-fit auditing (step 4) is judgment-heavy and easy to skimp on.
- **Vocab-leakage risk.** Step 5 catches it. Skip step 5 and you'll ship shape names that mislead context-free readers.
- **Debt-shape-lite risk.** Precedent often carries unset mutable-status booleans (`isReviewed`,
  `needsBackfill`, `isCurrent`) that were harmless during the source repo's bootstrap. Do not carry
  them forward unless they are durable facts with a question-catalog owner; otherwise derive them from
  certainty, review, lifecycle, or `IngestRecord` state.

## When to switch entries mid-stream

If step 6 reveals that your dimensions don't match the analog's fingerprint at all — three or more dimensions disagree — the analog is the wrong one. Either return to step 1 and pick a different one, or fall back to **entry A (query-first)** or **entry B (entities-first)** and design from scratch.

If step 4 reveals that 80%+ of the source manifest's shapes don't apply to your domain, you're not really doing pattern-match — you're using the source repo as a vocabulary thesaurus. Switch to **entry B** and use the source repo as a reference for naming conventions only.

---

## Next

After completing the workflow above, all paths converge at [references/checkpoint.md](../references/checkpoint.md). Pattern-match designs particularly need question 5 (pitfalls + context-free reader contract) walked carefully — the vocab-leakage check and the fingerprint-mismatch pitfalls are most relevant here.
