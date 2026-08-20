# Field-Level Shape Design: Entity Discovery

This reference covers the *width* dimension of shape design — but width is a symptom, and the real subject is **entity discovery**. When a shape grows wide, the usual cause is that it has quietly swallowed *other entities* that deserve to be their own Things. The fix is almost never "tune the storage"; it's "find the hidden entity, give it identity and a wref, and traverse to it."

It's the sibling of the four-direction test in [`primitives.md`](primitives.md) and [`checkpoint.md`](../../design-warmhub-repo/references/checkpoint.md): the four-direction test catches **relationship defects** (the wrong endpoints are reachable from the wrong sides); this lens catches **entity defects** (the shape is describing several entities at once, flattened into one wide thing). Both lenses apply to every design; neither subsumes the other.

> **Quick orientation.** If you're auditing an existing populated graph, walk the eight tells in § The Tells below in order, then read § Split or Inline for the decision rule. If you're designing a new shape, the tells double as a pre-mortem checklist before the first instance lands.

---

## Why this lens exists

The four-direction test is good at one specific defect: a relationship endpoint is encoded as a flat string instead of a wref, so the relationship is invisible from one side. It can pass cleanly on a shape that is nonetheless badly designed — for example, a `Voter` shape whose `about` is the single voter, no relationship endpoints in question — and still be carrying 66 fields, of which 28 actually describe the voter's *precinct*, not the voter.

That's the tell this lens is built for: **a wide shape is usually several entities wearing one shape's name.** The 28 precinct fields aren't "redundant columns to normalize away" — they're a `Precinct` entity that hasn't been born yet. Once you see it that way, the remedy is graph-native and obvious: precinct is a Thing, voters point a wref at it, and the graph gains a node it can traverse and reason about.

The symptoms that give a hidden entity away:

- **The same values repeat across many things that share an attribute.** A district name stored identically on every voter in a precinct is the precinct entity, copied. (~2,800 distinct precincts; the value stored ~9 million times.)
- **A field's value will be wrong at a different time.** An `age_at_year_end` field is correct on Dec 31 and silently wrong on Jan 1 — it isn't identity, it's a derivation that doesn't belong on an immutable thing.
- **Source strings defeat matching.** A `res_street_address` of `"2518 WAKE DR "` (double-space, trailing whitespace) won't match `"2518 WAKE DR"` — but it's the same address. Canonicalization left to readers is re-solved by every reader.
- **Two fields carry the same fact twice.** A `_desc` field and an `_abbrv` field encode one thing in two forms; one determines the other.
- **Only a few things ever have a value.** Sparse rural-only fields empty on 95%+ of voters point to a distinct sub-entity (a special-district membership), not a base-shape attribute.

None of these break a traversal. They all signal that the shape is doing more than describing one entity. That's what this lens is for.

---

## The Canonical Fail: NC Voters (66-field Voter shape)

This is the worked example throughout. Real public dataset (the NC voter file), audited at ~9.13M instances, ~66 fields per `Voter`. The shape passes the four-direction test cleanly (`Voter` has stable `ncid` identity, no relationship endpoints to mis-encode), but it has swallowed at least three other entities — `Precinct`, `DistrictAssignment`, and `County` — and flattened them onto every voter.

The entity-split rewrite — slim `Voter` (~20 fields) + `Precinct` (~2,800 instances) + `DistrictAssignment` (~2,800 instances) + `County` (100 instances) — is the worked pass example at the end. Each tell below is illustrated against the fat shape.

---

## The Tells

Walk these in order. Each is a question you ask of every shape that carries more than ~15 fields, and of every shape regardless of width once instance count crosses ~100K.

### Tell 1 — One entity per shape: does every field describe *this* thing's identity?

**The question.** Count the fields. If the shape carries more than ~25 fields, justify each one against the question catalog. A field that isn't an attribute of *this* entity's identity — and isn't the answer to a cataloged question about *this* entity — is almost always an attribute of a different entity hiding inside the shape.

**NC voters.** `Voter` carries 66 fields. The questions this graph actually serves — "is this person a registered voter?", "what district do they vote in?", "match this external donor record to a voter" — need roughly 18–20 fields *about the voter*. The other ~46 describe the precinct, the district assignment, or the county (tells 2–4), or are derived (tell 5), or unparsed source strings (tell 6).

**Threshold heuristic.** Width × instance-count is the real number. A 60-field shape with 200 instances is fine. A 25-field shape with 50M instances deserves an audit. A 66-field shape with 9.13M instances is the canonical fail — and the width is the tell that several entities are flattened into one.

**What "passes" looks like.** Every field on the shape either (a) is an attribute of the entity's own identity, (b) is on the matching-critical hot path that justifies inlining despite some repetition (see § Split or Inline), or (c) is explicitly justified as a context-free-legibility helper per [design-rules.md § Context-Free Legibility](design-rules.md).

### Tell 2 — Twin-encoded fields: do two fields carry the same fact?

**The question.** For each pair of fields, ask: does the value of one determine the value of the other? If yes, you're storing one fact twice on every instance — and often the pair is really pointing at a small lookup entity (the code↔name mapping is itself a Thing).

**NC voters.** Fourteen `_desc`/`_abbrv` twin pairs: `vtd_desc`/`vtd_abbrv`, `ward_desc`/`ward_abbrv`, `precinct_desc`/`precinct_abbrv`, `township_desc`/`township_abbrv`, and so on. Each pair carries one fact in two encodings — the abbreviation determines the description and vice versa. That's 28 fields doing the work of 14, copied across 9.13M instances.

Other common forms:
- `<id>` and `<id>String` (one a number, one the same number as text).
- `country_code` and `country_name` when the mapping is total and stable.
- `created_at` and `created_year` (the year is derivable; storing it bakes in a copy).

**What "passes" looks like.** Either keep the source-verbatim field and derive the other at read time, or pull the code↔name mapping into a small shared shape (the move in tell 3 — it's a lookup entity). The exception is when both forms are matching-critical on the hot path and re-deriving would dominate — then carry both inline, document that you knowingly kept both, and keep them in lockstep via the verbatim-plus-semantic pattern (see [`pattern-catalog.md` § Cross-Cutting Field-Design Patterns](../../design-warmhub-repo/references/pattern-catalog.md#cross-cutting-field-design-patterns)).

### Tell 3 — Repeated clusters: is a group of fields a hidden entity?

This is the central entity-discovery tell.

**The question.** Sample 5–10 things that share some natural attribute (same precinct, same supplier, same parent organization). If a contiguous cluster of fields is byte-for-byte identical across all of them, that cluster is a *different entity* being copied onto each thing instead of pointed at once.

**NC voters.** Five Wake voters on the same street, same precinct. These 28 fields are identical across all five — and across every voter in that precinct:

```
state_cd, county_id, county_desc, mail_city, res_city_desc, zip_code,
mail_zipcode, vtd_desc, vtd_abbrv, ward_desc, ward_abbrv,
precinct_desc, precinct_abbrv, dist_1_desc, dist_1_abbrv,
nc_house_abbrv, nc_senate_abbrv, cong_dist_abbrv, judic_dist_abbrv,
super_court_abbrv, munic_dist_desc, munic_dist_abbrv,
municipality_desc, municipality_abbrv, school_dist_desc,
school_dist_abbrv, county_commiss_desc, county_commiss_abbrv
```

That's ~42% of the thing, copied onto every voter who shares a precinct. NC has roughly 2,800 precincts. Storing the same "PROSECUTORIAL DISTRICT 10" string 9.13M times when ~50 distinct districts exist is the unmistakable tell: **the precinct is an entity, and it's been copied instead of referenced.**

**What "passes" looks like.** Give the hidden entity a name and a home. Extract the cluster into its own shape (`Precinct`, `Supplier`, `Organization`), keyed by its natural identity (`<county_id>-<precinct_abbrv>`, supplier id, org id). The original shape carries one wref to it. The repeated payload collapses by the repeat ratio (here ~3,000×) — but the real win is that the precinct is now a first-class node: addressable, queryable, and inbound-traversable.

**Traversal bonus.** Birthing the entity unlocks queries that were impossible while it was copied. Before: "show me all voters in NC House 049" means reading 9.13M voter things. After: query `DistrictAssignment` by `nc_house=049`, follow refs to `Precinct`, then inbound refs to `Voter`. Three traversal hops instead of scanning everything.

### Tell 4 — Optional-only fields: do only some things have a value?

**The question.** For each field, sample a representative slice: what fraction of things have a non-empty value? If it's below ~5% and the emptiness is structural (some things of this kind will never have a value, by domain rule), the field belongs to a *distinct sub-entity*, not the base entity.

**NC voters.** Twelve rural-only district fields — `township_*`, `fire_dist_*`, `sanit_dist_*`, `sewer_dist_*`, `water_dist_*`, `rescue_dist_*` — were empty on every voter sampled, urban and rural alike. They exist only for the rare precinct inside a special rural service district. Twelve fields × ~9M empty things is signal that "special-district membership" is its own entity, present only where it applies.

**What "passes" looks like.** Move the optional-only fields to a separate shape attached only to the things that have values — or fold them into the hidden entity from tell 3 so the emptiness is paid per-precinct, not per-voter. In the NC voters split, all twelve move to `DistrictAssignment` (one per precinct). The pattern generalizes: any field where the domain says "only some things of this kind have a value" is a sub-entity — a `VoterRegistration` for registration-specific fields, a `RuralDistrictMembership` for the rural-only ones — and the base shape stays narrow.

### Tell 5 — Derived / time-relative fields: will the value rot?

**The question.** For each field, ask: is the value derivable from other fields, and will the derivation give a different answer at a different time? Stored derivations on immutable things are dated bombs — and they aren't identity, so they don't belong as fields at all.

**NC voters.** `age_at_year_end` is derived from `birth_year`. Storing it bakes in a freshness liability: every January 1 the entire 9M-instance shape carries a stale field unless re-ingested. A voter with `birth_year=1970, age_at_year_end=56` is correct for end-of-2026 only; across a 5-year retention window the field accumulates 4 years of silent wrongness on 9M things.

Other common forms: `days_since_signup`, `quarter_to_date_revenue`, `is_active` (= "purchased in the last 30 days"), `display_age_band`, `current_quarter`/`current_fiscal_year` (global facts, not per-thing facts).

**What "passes" looks like.** Drop the derived field; compute at read time from the source-verbatim field (`birth_year`, `signup_at`). If the derivation is expensive enough to want caching, cache it in a derived query or a separate revisable shape — never inline on an append-only thing. The retention rule: **fields on immutable things must be true at write time and remain true forever.** Time-relative values violate this. (And if the "field" is really a *judgment* about the thing — a classification, a status, a confidence — it's an assertion, not a field; see [`primitives.md`](primitives.md).)

### Tell 6 — Unparsed source strings: is canonicalization left to readers?

**The question.** For each string field that downstream consumers will match or group on: did ingest canonicalize it (collapse whitespace, normalize case, USPS-standardize, strip punctuation), or did the source-system formatting survive intact?

**NC voters.** `res_street_address` arrives as `"2518 WAKE DR "` — double-space, trailing whitespace, no standardization. Every downstream matcher has to re-solve this from scratch: collapse spaces, trim, expand `DR` → `DRIVE`. The graph delegates standardization to every reader, repeatedly, instead of doing it once at ingest.

**What "passes" looks like.** Apply the [verbatim-source-plus-semantic-derived pattern](../../design-warmhub-repo/references/pattern-catalog.md#cc1--verbatim-source-plus-semantic-derived-fields): keep `<field>Raw` for the source bytes (audit trail) and add `<field>` for the canonicalized value (matching-ready). Bind the canonicalization to a `mappingPolicyWref` so the policy can evolve without silent drift (see [`design-rules.md` § Stale-Verdict Retraction Discipline](design-rules.md)). For NC addresses: keep `res_street_address_raw: "2518 WAKE DR "` and add `res_street_address: "2518 WAKE DRIVE"`. Matchers read the canonical field; audit reads the raw.

### Tell 7 — Yes/no flags stored as one-character strings

The minor tell — an encoding nit, not an entity, included for completeness at scale.

**The question.** For each field whose domain is "yes/no/null", what's the storage representation? A one-character string field pays full string overhead for one bit of information.

**NC voters.** Five Y/N flag fields — `ssn`, `drivers_lic`, `hava_id_req`, `no_dl_ssn_chkbx`, `confidential_ind` — each store `"Y"`/`"N"`/`""`. That's ~45M string allocations for what is structurally a small bitfield.

**What "passes" looks like.** Pack adjacent flags into one field — a small fixed-position string (`id_flags: "YN-YN"`) or a single semantic enum if the combination has names that matter (`id_status: "verified-no-license"`). Document the encoding in the field description so context-free readers can decode it. This only pays when flag-count × instance-count is large (~10M+); below that, field-name clarity wins.

### Tell 8 — Query-surface honesty: do declared filter fields match what you actually navigate by?

WarmHub reaches things two ways: by **identity** (name / wref / prefix glob) and by **traversal** (following assertions and refs). On top of that, a *small* set of fields can be declared filterable and backed by an indexed-field entry. Declaring dozens of fields filterable is table-thinking — it promises a filter surface the runtime won't actually back, and it's another sign the shape is over-wide.

**The question.** Count the fields the shape declares filterable. Compare against the few that have an indexed-field entry actually built. How wide is the gap, and at what instance count does it bite?

**NC voters.** The shape declares 66 fields filterable; the indexed set is empty. At 9.13M instances, filtering on any field walks every instance. The shape says "every field is a first-class filter" when in reality only a handful (`ncid`, `last_name`+`zip`, `county_id`, `party_cd`, `status_cd`) will ever be filtered on — and most access is by identity (`Voter/<ncid>`) and traversal anyway.

**What "passes" looks like.** Split the shape (tells 1–4) until the filterable-field set is small and honest. For the split `Voter` (~20 fields), the real filter set is 5–7: `ncid` (identity), `last_name` and the canonical address fragment (matching), `county_id`/`party_cd`/`status_cd` (filtering), `registr_dt` (cohorts). Those few can be backed by indexed-field entries and the shape can mean what it says. **Decision rule:** if a shape declares more than ~10 fields filterable on a >1M-instance population, the fix is to slim the shape (find the hidden entities), not to declare more filters.

---

## Split or Inline — deciding what becomes its own Thing

Entity discovery has a failure mode of its own: splitting *everything* out, so a single read fans out into a dozen wref resolutions. Not every repeated field is a separate entity, and not every real entity should be split if doing so wrecks the hot read path.

**The principle.** Split out the genuine entities — clusters that have their own identity and lifecycle (a precinct is redistricted; a supplier has its own existence). Keep fields inline when they're attributes of *this* entity **and** read on the hot path, even when they introduce some repetition.

**Why this balance.** The hot path for the NC voters graph is donor matching: given an external donor record, find the same person. That's a fuzzy match on (`last_name`, `birth_year`, `zip_code`, `res_street_address`). At 9M instances the matcher reads those four fields hundreds of millions of times. If they're inline on `Voter`, that's one read per candidate. If they're scattered across `Voter` + `Address` + `Precinct` via wrefs, it's four reads per candidate — and the wref-resolution overhead at this scale is real. So `Voter` keeps the four matching-critical fields inline; their slight repetition is dominated by the cost of splitting them away.

The precinct cluster is *not* on the hot match path — it answers "what district is this voter in?" *after* a match, read once per matched voter, not once per attempt. Splitting it out costs nothing on the hot path and births a useful entity. Split it.

**The rule.** For each field cluster, ask:

1. *Is it a genuine entity?* (own identity, own lifecycle, worth traversing to)
2. *Is it on the hot-path workload?* (matching, primary lookup, real-time filter)
3. *Does the consumer read it once-per-thing or once-per-attempt?*

Split when it's a genuine entity, cold-path, or read once-per-matched-thing. Inline when it's a plain attribute, hot-path, or read on every attempt.

**This balance is fingerprint-aware.** A graph whose dominant workload is enumeration (reporting over everything) tilts toward splitting more out — the extra hops amortize across the report. A graph whose dominant workload is point-lookup matching (donor reconciliation, identity resolution) tilts toward inlining the matching-critical fields. The NC voters graph is the second kind.

---

## Worked Example: NC Voters, entities split out

Starting from the 66-field `Voter` shape, the entity-split design is four shapes:

### `Voter` — slim core (~20 fields). Stays addressable as `Voter/<ncid>`.

```
ncid, first_name, middle_name, last_name, name_suffix_lbl,
birth_year, gender_code, race_code, ethnic_code, birth_state,
res_street_address_raw, res_street_address,    // raw + canonical (tell 6)
mail_address_block,                            // omitted if equals res
party_cd, status_cd, reason_cd,
registr_dt, voter_reg_num,
confidential_ind, id_flags,                    // packed flags (tell 7)
full_phone_number,
precinctWref                                   // → Precinct (tell 3 split)
```

Matching workload still hits one shape; the matching-critical fields (`last_name`, `birth_year`, address) stay inline.

### `Precinct` — keyed `Precinct/<county_id>-<precinct_abbrv>`, ~2,800 instances.

```
county_id, countyWref,
precinct_abbrv, precinct_desc,
vtd_abbrv, vtd_desc,
ward_abbrv, ward_desc,
township_abbrv, township_desc,
municipality_abbrv, municipality_desc,
districtAssignmentWref                         // → DistrictAssignment
```

Holds the precinct-scoped name/abbrv pairs once instead of once-per-voter. The `_desc`/`_abbrv` twins (tell 2) still appear, but stored 2,800 times rather than 9.13M — and at that count keeping both forms is cheap and saves canonicalization on read.

### `DistrictAssignment` — keyed by Precinct, ~2,800 instances.

```
precinctWref,
nc_house, nc_senate, cong_dist,
dist_1_abbrv, dist_1_desc,                     // prosecutorial
judic_dist_abbrv, super_court_abbrv,
school_dist_abbrv, school_dist_desc,
county_commiss_abbrv, county_commiss_desc,
munic_dist_abbrv, munic_dist_desc,
fire_dist_abbrv, fire_dist_desc,               // optional-only (tell 4) — empty on urban
sanit_dist_abbrv, sanit_dist_desc,             // optional-only
sewer_dist_abbrv, sewer_dist_desc,             // optional-only
water_dist_abbrv, water_dist_desc,             // optional-only
rescue_dist_abbrv, rescue_dist_desc            // optional-only
```

The 12 optional-only rural fields stay optional, but the emptiness is paid 2,800 times not 9.13M. Districts move as a bundle at redistricting; an assignment-per-precinct shape matches that update pattern.

### `County` — 100 instances.

```
county_id, county_desc, state_cd
```

Tiny lookup entity. Stable identity. Inbound traversal from `Precinct.countyWref` makes "all precincts in Wake County" a one-hop query.

### Storage math

Roughly:

- Before: 9.13M things × ~28 precinct-uniform fields = ~256M copied strings.
- After: 2,800 Precinct + 2,800 DistrictAssignment things hold those fields once each — a ~3,000× reduction on the district payload, with one wref per voter to replace them.
- Optional-only rural fields: empty-slot overhead drops from ~110M to ~33K.
- `_desc`/`_abbrv` twins are no longer copied onto every voter; they live on Precinct/DistrictAssignment where the repeat is paid 2,800 times.

### Drop, don't split

Some fields don't need a new home — they should just go away:

- **Drop `age_at_year_end`** (tell 5). Derive from `birth_year` at read time.
- **Drop `mail_zipcode`** when it equals `zip_code` (overwhelmingly common).
- **Drop the `mail_addr` block** when it equals `res_street_address` (common); collapse `mail_addr1..4` into one optional `mail_address_block` only when populated.
- **Drop the filterable-field declarations** that won't be backed by an indexed-field entry; let the slim shape's filter surface match what's actually indexed.

### Filter surface, recovered

The slim `Voter` shape supports 5–7 honest indexed-field entries covering the real workload: `ncid` (identity), `last_name` and the canonical address fragment (matching), `county_id`/`party_cd`/`status_cd` (filter), `registr_dt` (cohort). Each is cheap and earns its keep on the hot workload. This is what tell 8 was pointing at: birthing the hidden entities made the filter surface honest.

### Graph navigability — better, not worse

After the split:

- "All voters in NC House 049" → query `DistrictAssignment` by `nc_house=049`, follow refs to `Precinct`, then inbound refs to `Voter`. Traversal hops instead of a 9.13M-instance scan.
- "All precincts in Wake County" → `County` inbound `Precinct` refs.
- "What districts does this voter vote in?" → `Voter` → `Precinct` → `DistrictAssignment`.
- A downstream consumer repo's `DonorEntity` wrefs still target `Voter/<ncid>` — stable identity is preserved across the migration.

---

## Multi-valued fields: native arrays, not stringified blobs

A multi-valued field — a list of tags, a set of evidence references — has three honest encodings and one anti-pattern:

- **Native `array` of scalars** (`{"type":"array","items":"string"}`) — for plain multi-valued data (tags, labels, codes). This is a real field type; use it directly.
- **Native `array` of wrefs** (`{"type":"array","items":"wref"}`) — for a multi-valued *relationship* where the members are things. Each member is **version-pinned** and **independently reverse-traversable**: `wh thing refs <member> --inbound` finds the holding thing *via the array field*, and it fans out **cross-repo**. So a wref array is a first-class traversable relationship, not opaque data.
- **A relationship assertion** (Arc/Bond/Set per the four-direction test) — when the link itself carries data (certainty, basis, kind) or you want the relationship to be its own versioned thing. Choose this over a wref array when the *edge* needs attributes; choose the wref array when you just need "this thing points at these N things" with per-member reverse traversal.

The anti-pattern: **a JSON-stringified blob in a single string field** (`evidence_ids: "[\"a\",\"b\"]"`, parsed by every reader). Two faults at once — it's the flat-string-endpoint failure ([`pattern-catalog.md` § A5](../../design-warmhub-repo/references/pattern-catalog.md)), so the members don't traverse from their own side; and it's *unnecessary*, because a native array gives the same multiplicity with per-member traversal for free. (Older guidance claimed shape validation had "no array type" and forced stringification — that is stale; native arrays, including wref arrays, are supported.) If a multi-valued field will ever be matched, joined, or traversed on, it must not be a stringified blob.

## When this lens does and doesn't apply

**Apply entity-discovery review when:**

- A shape carries more than ~25 fields, regardless of instance count.
- A shape carries any number of fields and instance count exceeds ~100K.
- You're ingesting from a flattened source (CSV export, spreadsheet artifact, flattened API response). These almost always carry repeated clusters the source system actually kept as separate entities.
- A shape declares more filterable fields than you'll ever navigate by.
- You see twin-encoded fields (`_desc`/`_abbrv`, `_id`/`_name`) or time-relative fields (`age`, `days_since`, `current_*`) on a populated shape.
- The graph's hot workload is point-lookup matching against many fields per attempt.

**Skip it when:**

- The shape carries < 15 fields and instance count is < 100K. The width tax is real but small; spend the budget elsewhere.
- The shape is a small reference lookup with stable identity (e.g. `County` at 100 instances). Width doesn't matter at small N.
- The shape was deliberately widened for context-free legibility per [`design-rules.md` § Context-Free Legibility](design-rules.md) and the mirrored fields are doing real work for readers. (Distinguish this from accidental width: deliberate mirroring is annotated; a swallowed entity is silent.)

---

## When the audit reveals a fingerprint-level problem

Sometimes the audit surfaces something deeper than "split out a precinct shape." If you find that:

- The shape carries fields from **multiple distinct entities** with no clear primary subject (tells 1 and 3 fire together, hard), it may be conflating two domains into one thing. Re-run [the dimensions diagnostic](dimensions.md) — you may have matched the wrong fingerprint.
- The shape carries fields that are **judgments about the entity rather than its identity** (a classification, a certainty, a review status — tell 5 fires on time-relative state), those are assertion shapes per [`primitives.md`](primitives.md), not fields on a thing.
- The cluster you'd split out is itself an entity with its own external identity and lifecycle (precincts have canonical state-board identity, their own redistricting events), the split unlocks more than storage — it gives that entity a place in the graph it never had. Consider whether it now deserves its own provenance, certainty, or review shapes too.

In those cases the field-level audit is the symptom; the cure is at the fingerprint or shape-set layer. Return to [`pattern-catalog.md`](../../design-warmhub-repo/references/pattern-catalog.md) and reconsider the model family for the layer that grew wide.

---

## How this interacts with append-only revision

Width changes are shape migrations. On a populated graph, slimming a shape from 66 fields to 20 + birthing 3 new shared shapes is a non-trivial retract-and-replay operation. The discipline lives in [`migrations.md`](../../build-warmhub-repo/references/migrations.md), but two specifics:

1. **Split-out entities need stable deterministic names from the start.** `Precinct/<county_id>-<precinct_abbrv>` survives re-ingest cleanly because the seed was in the source data all along. UUID-named split-out shapes don't survive re-ingest — every replay mints a new UUID and the wrefs on `Voter` rot.

2. **Migrating the wref-bearing field is the cascade hazard.** Every `Voter` that carried 28 precinct fields now needs a `precinctWref` instead. The migration writes the 2,800 Precinct + DistrictAssignment things first, then revises every Voter to swap the fat fields for the wref. Both stages are append-only; the v1 `Voter` shape is retracted, not deleted; downstream consumers holding wrefs to `Voter/<ncid>` still resolve because `ncid` identity is preserved across the v1 → v2 revision.

---

## Quick checklist (for design-time pre-mortems and entry-E audits)

Walk these for every shape that's wide or instance-heavy:

- [ ] **T1.** Does every field describe *this* entity's identity, or are other entities hiding inside?
- [ ] **T2.** No two fields encoding the same fact in two forms?
- [ ] **T3.** No cluster of fields that's identical across things sharing a natural attribute (a hidden entity)?
- [ ] **T4.** No field empty on >95% of things by domain rule (a sub-entity)?
- [ ] **T5.** No field whose value will rot with calendar time (and no judgment masquerading as a field)?
- [ ] **T6.** All matching-critical strings canonicalized at ingest (raw + semantic per CC.1)?
- [ ] **T7.** No 1-bit information stored as a 1-character string at scale?
- [ ] **T8.** Filterable-field declaration matches what you actually navigate by and can index?

A shape that passes the four-direction test and this checklist is structurally honest at both the relationship and the entity layers.
