# `design-warmhub-repo` — sample test prompts

Five design-task prompts for exercising the `design-warmhub-repo` skill and providing feedback. Each was chosen to probe a different aspect of the skill: catalog recall, generalization to a novel domain, vocabulary misdirection, layered designs, and adaptive variants.

## How to use

You'll need:

- The `design-warmhub-repo` skill installed locally, per your skill marketplace's standard process.
- A Claude Code session (any directory).

For each prompt:

1. Paste the prompt into Claude Code, or invoke the skill explicitly (`/design-warmhub-repo`).
2. Read the resulting design.
3. Note your reactions — does it match what you'd design? Does it miss anything obvious? Is there ceremony you find unhelpful? Did it catch a mistake you'd have made?
4. Send feedback (see end of doc for where).

You don't have to run all five. Even a single prompt with thoughtful feedback is useful.

---

## Prompt 1 — project tickets queryable substrate

> The goal is to have a queryable form of project tickets across multiple source systems
>
> to do so we should design a high performance substrate to ingest (1 way sync), store and define query strategy
>
> we want to be able to perform a series of operations over the corpus
>
> are there natural clusters of tickets?
> are there duplicates?
> what tickets are stale?
> are there high entropy tasks that would unlock other tickets?
> and so on

**What it tests.** A domain the skill's reference library has prior knowledge of. Should produce a clean, complete design. If the skill struggles here, something is broken — this is the recall baseline.

**What "good" looks like.** Design uses a Bond (symmetric binary collection) for duplicate-of relationships and an Arc (directional) for blocks-of relationships. Treats "stale tickets" and "high-entropy tasks" as derived queries, not durable shapes. Includes a content-addressed analytical-policy shape for clustering. Caps ticket body bytes — proxies the source system, doesn't own the bytes. Walks a 5-question design-review checklist explicitly.

---

## Prompt 2 — vulnerability disclosure lifecycle

> We're building a graph to track our software vulnerability lifecycle. Reports come in from multiple sources: internal pen-testing, external bug bounty submissions, automated SAST scanners, and CVE feeds. The same underlying vulnerability often gets reported multiple times by different reporters who describe it differently. Some vulnerabilities lead to security incidents; some incidents involve multiple co-exploited vulnerabilities. Some vulnerabilities are flagged but later determined to be false-positives or duplicates of known issues.
>
> We want the graph to support:
> - "What's the full disclosure history of this vulnerability?"
> - "Find duplicate reports of the same underlying vulnerability across our sources."
> - "Which vulnerabilities have been exploited in which incidents?"
> - "What's our triage queue — vulnerabilities reported recently with no determination yet?"
> - "Which vulnerabilities have the highest blast radius — most incidents traced back to them?"
>
> Help us design this.

**What it tests.** Same structural pattern as prompt 1 but a vocabulary the skill's reference library has never seen (no ticket corpus, no duplicate clusters). Tests whether the skill applies principles or template-matches the ticket-corpus design with renamed shapes.

**What "good" looks like.** Design produces fully domain-specific names (Report / Vulnerability / Incident — not TicketProxy / Cluster). Same structural disciplines as prompt 1: Bond for symmetric same-vulnerability, Arc for directional exploits-in. Justifies why a canonical Vulnerability is graph-synthesized rather than just an external proxy. Triage queue and blast radius are derived queries, not durable shapes.

---

## Prompt 3 — customer feedback across channels

> We collect customer feedback through five channels: support emails, in-app feedback widget submissions, support tickets in Zendesk, recorded sales-call transcripts, and Twitter mentions of our handle. We want to find when the same complaint shows up across multiple channels (often paraphrased differently), tag complaints by feature area (auth, mobile, billing, etc.), identify which complaints have been addressed by recent feature releases, and rank our investment priorities by how many complaints each potential investment would resolve. Some complaints are blockers for others (e.g. "I can't reset my password" blocks "I can't access my account on mobile").
>
> Design the WarmHub graph for this.

**What it tests.** Naturally requires a layered design — channel proxies + theme synthesis + cross-channel relationships. Tests whether the skill recognizes layered designs and articulates the interface shapes between layers.

**What "good" looks like.** Design names two distinct design layers (one for channel proxies + cross-channel relationships, one for theme synthesis) and identifies which assertions bridge the two layers. Investment priorities are a derived query, not a stored ranking shape. Cross-channel duplicate-of uses Bond; blocker relationships use Arc.

---

## Prompt 4 — Slack message-as-answer surface

> We want to capture which Slack messages in our team channels best answer common questions that come up repeatedly. Sometimes the same question gets re-asked weeks later by a new team member; sometimes the best answer is buried in a thread reply rather than being the first response. We want to track which message-threads contain answer-quality content, link related questions across channels, and surface the canonical "this is the answer" message for each recurring question pattern.
>
> Help us design the graph.

**What it tests.** The vocabulary (messages, threads, channels) suggests an operational state-tracking domain. The actual structure is pattern-mining + external-proxy + curation. Tests whether the skill diagnoses by structure or gets pulled toward the wrong design pattern by surface terms.

**What "good" looks like.** Design explicitly names the trap: Slack itself is the operational system; this graph is the analysis layer over it. Includes a graph-synthesized recurring-question concept — not just message proxies. Best-answer relationship uses Arc (directional). Same-question-as relationship uses Bond (symmetric).

---

## Prompt 5 — legal precedent citation graph

> We're building a research graph to track legal precedent across U.S. federal courts. Court opinions cite other opinions; some citations *affirm* the cited case's reasoning, some *distinguish* the cited case (limit it to its facts), and some *overturn* it. We want to find the most-cited cases (centrality), identify cases that overturn the most prior precedent (signs of doctrinal shift), find inconsistent precedent (cases on the same legal question with conflicting holdings), and trace how a doctrinal line evolves across decades.
>
> Design the graph.

**What it tests.** A domain that's structurally close to a literature-review pattern but with typed citation kinds (Affirms / Distinguishes / Overturns) that are themselves load-bearing — meaning the citation kind affects how subsequent queries should treat the citation. Tests whether the skill recognizes the variant and adapts the pattern rather than porting a uniform-edge design verbatim.

**What "good" looks like.** Design extends the literature-review pattern with typed-edge-kind discipline — either distinct assertion shapes per citation kind, or a single citation shape with a typed-kind enum whose semantics actually affect traversal (not just a flat string field). Centrality (most-cited) is a derived query. Doctrinal-line evolution is a multi-hop graph traversal, not a stored synthesized object.

---

## What to look for, what to report back

Useful signals in roughly decreasing order of value:

1. **The skill produces a confident-but-wrong design.** This is the gold signal — it tells us where the reference-design library or the dimensional diagnostic needs to sharpen. If you can describe a specific way the design is wrong, please report.
2. **The skill stumbles on diagnosis.** If it can't pick an entry path, or matches the wrong reference design, that's also valuable.
3. **The skill's output is too verbose or has unhelpful ceremony.** Outputs run ~400–550 lines on average. If you find specific sections you'd cut, that informs a possible "lite" rendering option.
4. **The skill uses methodology jargon that bleeds into the design.** If you see vocabulary you'd have to translate before passing the design to a domain team, please flag.
5. **The skill catches a mistake you'd have made.** Confirmation signal — useful for understanding what value the skill adds, even when it's not surfacing a defect.

## Notes for context

- The skill is intentionally opinionated about a few things, especially: relationship endpoints should target a named collection via `about: "Arc/<name>"` or `about: "Bond/<name>"` (or `Set/`/`List/`), created by a prior named `kind:"collection"` op, rather than encoded as flat string fields (because `about` is immutable and a flat field is invisible to backref queries); "needs work" / "queue" / "stale" state should be a derived query, not a durable shape; and synthesized artifacts produced by expensive (LLM, embedding, scoring) derivations should bind to a content-addressed policy shape so verdicts can be retracted en masse when the policy changes.
- The skill has been validated empirically (5-prompt eval battery, 49 assertions, 2 iterations) — but every additional real-world test prompt that surfaces a gap is high-value feedback.

## Where to send feedback

Send feedback through the maintainer's normal channel. If you have a specific design output you think is wrong, include it alongside your reaction — concrete examples are much easier to act on than abstract ones.
