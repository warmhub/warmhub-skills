#!/usr/bin/env node
// Verify-relationships: callable checker for checkpoint Gate 2 (four-direction test).
// Implements Gate 2a (design-time) and Gate 2b (runtime, against populated data).
//
// Usage:
//   node verify-relationships.mjs --repo <org/name> [--dry-run] [--sample-size N] [--shape <Name>]
//   node verify-relationships.mjs --manifest <path.json>          # offline 2a
//
// Modes:
//   --dry-run        2a only. Inspects shape definitions + a small sample of
//                    assertion data; flags any shape whose data uses a string-typed
//                    field that names a wref (the DuplicateAssertion smell).
//                    Does not walk endpoints or call wh thing about.
//   default          2a + 2b. Samples assertions per shape, classifies aboutWref
//                    (Pair / Set / List / single thing), and runs
//                    independent reachability checks per endpoint:
//                      (a) `wh thing about <endpoint> --resolve-collections
//                          --shape <X> --all` returns this assertion.
//                      (b) `wh thing refs <endpoint> --inbound --all` returns
//                          the collection thing (for Pair/Set/List).
//                      (c) For every typed-wref data field on the assertion,
//                          the target reports this assertion via `wh thing
//                          refs <target> --inbound --all`. Covers single-about
//                          shapes carrying typed-wref data fields (e.g.
//                          Violation about EnforcementCase with
//                          documentedByInspections: wref[]).
//                      Pagination is delegated to `wh --all`; high-degree
//                      endpoints don't silently false-fail.
//
//   CROSS-REPO CAVEAT: check (a) `wh thing about` is REPO-LOCAL — it returns 0
//                      for endpoints whose inbound assertions live in another
//                      repo, even when the relationship is correctly designed.
//                      Check (c) `wh thing refs --inbound` is the cross-repo
//                      authority. For a relationship that crosses a repo
//                      boundary, treat (a) as non-authoritative and rely on the
//                      refs-inbound result; do not report a typed-wref-field
//                      cross-repo link as a 2b failure just because reverse
//                      `about` is empty. See
//                      ../modeling-foundations/references/primitives.md
//                      § The four-direction test across a repo boundary.
//   --manifest PATH  Read shape definitions from a local JSON file with the same
//                    shape as `wh shape list --json` output. Used when no live
//                    repo is reachable; only 2a smell checks run in this mode.
//
// Exits non-zero on any failure.

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { argv, exit } from 'node:process';

const args = parseArgs(argv.slice(2));
const SAMPLE_SIZE = Number(args['sample-size'] ?? 10);
const DRY_RUN = !!args['dry-run'];
const TARGET_SHAPE = args.shape ?? null;
const MANIFEST = args.manifest ?? null;
const REPO = args.repo ?? null;

if (!REPO && !MANIFEST) usage('one of --repo or --manifest is required');
if (MANIFEST && !DRY_RUN && !REPO) {
  // manifest mode is offline; 2b not possible without --repo
}

const failures = [];
const warnings = [];

function parseArgs(arr) {
  const out = {};
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = arr[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function usage(msg) {
  if (msg) console.error(`error: ${msg}\n`);
  console.error('usage: verify-relationships.mjs (--repo <org/name> | --manifest <path>) [--dry-run] [--sample-size N] [--shape <Name>]');
  exit(2);
}

function wh(...cliArgs) {
  if (REPO) cliArgs = [...cliArgs, '--repo', REPO];
  const r = spawnSync('wh', [...cliArgs, '--json'], { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`wh ${cliArgs.join(' ')} failed: ${r.stderr || r.stdout}`);
  }
  try {
    return JSON.parse(r.stdout);
  } catch {
    throw new Error(`wh ${cliArgs.join(' ')} did not return JSON: ${r.stdout.slice(0, 200)}`);
  }
}

// --- Shape introspection ---
//
// `wh shape list --json` returns an array of summaries:
//   [{ name, kind, active, version: { version, operation, data: { fields, description }, dataHash } }]
// Fields is an object: { fieldName: typeString | typeObject }.

function loadShapes() {
  if (MANIFEST) {
    const text = readFileSync(MANIFEST, 'utf8');
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : (data.items ?? data.shapes ?? []);
  }
  const data = wh('shape', 'list');
  return Array.isArray(data) ? data : (data.items ?? []);
}

function getShapeFields(shape) {
  return shape?.version?.data?.fields ?? {};
}

function getShapeDescription(shape) {
  return shape?.version?.data?.description ?? '';
}

function fieldTypeString(t) {
  if (typeof t === 'string') return t;
  if (t && typeof t === 'object') return JSON.stringify(t);
  return '';
}

// Normalize a field type declaration into a base type name, regardless of how
// it's expressed. Handles all of:
//   "string"            → "string"
//   "string?"           → "string"   (trailing ? marks optional)
//   "wref"              → "wref"
//   "wref?"             → "wref"
//   "wref[]"            → "wref"     (array suffix)
//   { type: "string" }  → "string"
//   { type: "wref", optional: true } → "wref"
//   { type: "array", items: "wref" } → "wref"
//   { type: "array", items: { type: "wref" } } → "wref"
// Anything we can't normalize returns the raw string form so the smell check
// errs on the side of flagging unexpected shapes.
function normalizeFieldType(t) {
  if (typeof t === 'string') {
    return t.replace(/\?$/, '').replace(/\[\]$/, '').toLowerCase();
  }
  if (t && typeof t === 'object') {
    const inner = t.type ?? t.kind ?? null;
    if (inner === 'array' || inner === 'list') {
      return normalizeFieldType(t.items ?? t.element ?? 'unknown');
    }
    if (typeof inner === 'string') return normalizeFieldType(inner);
  }
  return 'unknown';
}

function isWrefType(t) {
  return normalizeFieldType(t) === 'wref';
}

// --- About-arity classification ---
//
// Shape definitions do NOT declare `about` arity — it is observable only
// from assertions' `aboutWref` strings. We classify by the wref's leading shape
// segment: `Pair/...`, `Set/...`, `List/...`, or anything else.

function classifyAboutWref(aboutWref) {
  if (typeof aboutWref !== 'string') return { kind: 'unknown' };
  if (aboutWref.startsWith('Pair/')) return { kind: 'pair' };
  if (aboutWref.startsWith('Set/')) return { kind: 'set' };
  if (aboutWref.startsWith('List/')) return { kind: 'list' };
  return { kind: 'single' };
}

function stripVersionSuffix(wref) {
  // Drop trailing @vN if present so `wh thing about` accepts it cleanly.
  return typeof wref === 'string' ? wref.replace(/@v\d+$/, '') : wref;
}

// --- Gate 2a smell checks ---
//
// Two flavors:
//   (1) Schema-level: a shape field whose name ends in `Wref` but is typed as
//       a string (not the canonical `wref` type). Strong signal of the
//       DuplicateAssertion failure pattern.
//   (2) Data-level: sample a few assertions; flag any string-valued data field
//       whose name ends in `Wref` and whose value looks like a wref (contains a
//       `/`). Catches ingest drift where the schema is correct but the writer
//       is shoehorning a wref into a string field.

function schemaSmells(shape) {
  // Flag any field whose name ends in `Wref` but whose declared type
  // normalizes to anything other than `wref`. Catches `string`, `string?`,
  // `{ type: "string" }`, `{ type: "string", optional: true }`, etc. The
  // canonical DuplicateAssertion failure looks like `originalWref:
  // "string"` — and ingest pipelines can express that as any of those forms.
  const fields = getShapeFields(shape);
  const out = [];
  for (const [name, type] of Object.entries(fields)) {
    if (!name.toLowerCase().endsWith('wref')) continue;
    const base = normalizeFieldType(type);
    if (base !== 'wref' && base !== 'unknown') {
      out.push({ name, reason: `field name ends in Wref but typed as ${base} (raw: ${fieldTypeString(type)}) — should be wref-typed or modeled as a Pair endpoint` });
    }
  }
  return out;
}

function dataSmells(shape, assertions) {
  // Data-level drift check: a *Wref-named field with a wref-shaped string value
  // *that the schema does NOT declare as wref* is suspicious. A correctly-typed
  // wref field carries a wref-shaped string in assertion data — that's normal
  // and must not false-fail. Consult the declared schema type before flagging.
  const fields = getShapeFields(shape);
  const out = [];
  for (const asn of assertions) {
    const data = asn.data ?? {};
    for (const [k, v] of Object.entries(data)) {
      if (!k.toLowerCase().endsWith('wref')) continue;
      if (typeof v !== 'string') continue;
      if (!v.includes('/')) continue;
      // If the schema declares this field as a wref-family type, the data is
      // exactly what we expect — skip silently.
      if (isWrefType(fields[k])) continue;
      out.push({
        shape: shape.name,
        assertion: asn.wref ?? asn.name ?? '<unknown>',
        field: k,
        value: v,
        reason: `data field ends in Wref with a wref-shaped string value, but the schema type is ${normalizeFieldType(fields[k])} (raw: ${fieldTypeString(fields[k])}) — typed-wref/flat-string drift`,
      });
      break; // one example per assertion is enough
    }
  }
  return out;
}

// --- Gate 2b runtime checks ---

function sampleAssertions(shapeName, n) {
  const data = wh('assertion', 'list', '--shape', shapeName, '--limit', String(n));
  const items = Array.isArray(data) ? data : (data.items ?? []);
  return items;
}

function hasThingsOfShape(shapeName) {
  // Cheap probe: is this a Thing shape rather than an assertion shape?
  // Returning even one Thing means the shape is not a relationship/assertion
  // shape and the empty assertion-list result is expected, not a 2b-partial.
  const data = wh('thing', 'list', '--shape', shapeName, '--kind', 'thing', '--limit', '1');
  const items = Array.isArray(data) ? data : (data.items ?? []);
  return items.length > 0;
}

function viewThing(wref, opts = {}) {
  const extra = opts.dataMode ? ['--data-mode', opts.dataMode] : [];
  return wh('thing', 'view', wref, ...extra);
}

function collectionMembers(wref) {
  // The collection-domain op enumerates members directly, independent of
  // whatever body size a generic thing-view read decides to return. Prefer
  // this over reading the collection thing when it's available.
  return wh('collection', 'members', wref, '--all');
}

function extractMemberWrefs(membersResult) {
  const items = Array.isArray(membersResult) ? membersResult : (membersResult.items ?? membersResult.members ?? []);
  return items
    .map((m) => (typeof m === 'string' ? m : m?.wref ?? m?.id))
    .filter((w) => typeof w === 'string')
    .map(stripVersionSuffix);
}

// Large Set/List collections can come back from a generic `wh thing view`
// read as a summary body (no `members`/`items` field materialized at all),
// which makes collectEndpointWrefs() return zero endpoints and would
// false-fail the four-direction test on a collection that's simply big, not
// broken. Prefer `wh collection members` (the collection-domain op) to
// enumerate endpoints; fall back to a forced full-data `wh thing view
// --data-mode full` read only if that op errors, and if the body is *still*
// summary-only, report "needs a full read" rather than mis-reporting zero
// endpoints.
function resolveCollectionEndpoints(aboutWref) {
  try {
    const endpoints = extractMemberWrefs(collectionMembers(aboutWref));
    if (endpoints.length > 0) return { endpoints };
  } catch {
    // `wh collection members` unavailable/errored — fall through to the
    // generic thing-view path below.
  }
  const collection = viewThing(aboutWref, { dataMode: 'full' });
  if (collection?.dataMode === 'summary' || collection?.fullData === false) {
    return { endpoints: [], needsFullRead: true };
  }
  return { endpoints: collectEndpointWrefs(collection) };
}

function aboutEndpoint(wref, shapeName) {
  // --all paginates so high-degree endpoints don't false-fail when the target
  // assertion is past the first page. CLI handles cursoring; we just consume.
  return wh('thing', 'about', wref, '--resolve-collections', '--shape', shapeName, '--all');
}

function inboundRefs(wref) {
  // Same rationale: paginate so a high-degree endpoint doesn't drop the
  // collection-thing from the result set just because it's on page 2+.
  return wh('thing', 'refs', wref, '--inbound', '--all');
}

function extractWrefFieldValues(shape, asn) {
  // Pull every typed-wref value out of an assertion's data, including arrays.
  // Used by the data-field reachability check below: for each typed-wref field
  // an assertion declares, the target should report this assertion via
  // `wh thing refs <target> --inbound`. Flat-string-encoded values would also
  // be returned here (they're indistinguishable in data), but the schema check
  // already flags those at 2a; we trust the schema here.
  const fields = getShapeFields(shape);
  const out = [];
  for (const [name, type] of Object.entries(fields)) {
    if (!isWrefType(type)) continue;
    const value = asn.data?.[name];
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (typeof v === 'string') out.push({ field: name, wref: stripVersionSuffix(v) });
      }
    } else if (typeof value === 'string') {
      out.push({ field: name, wref: stripVersionSuffix(value) });
    }
  }
  return out;
}

function checkDataWrefReachability(shape, asn) {
  // For every typed-wref field in this assertion's data, confirm the assertion
  // is reachable from the target via `wh thing refs <target> --inbound`. This
  // is the empirical typed-wref check for the *non-collection* relationship
  // case: a shape with `about: <single-thing>` plus typed-wref data fields
  // pointing at other endpoints (e.g. Violation about EnforcementCase with
  // documentedByInspections: wref[]). The `about` check confirms only the
  // subject side; this loop confirms every additional endpoint.
  const wrefValues = extractWrefFieldValues(shape, asn);
  if (wrefValues.length === 0) return;
  const asnWrefNoVer = stripVersionSuffix(asn.wref);
  for (const { field, wref } of wrefValues) {
    let refsResult;
    try {
      refsResult = inboundRefs(wref);
    } catch (e) {
      warnings.push({
        shape: shape.name,
        reason: `wh thing refs ${wref} --inbound failed (data.${field}): ${e.message}`,
      });
      continue;
    }
    const items = Array.isArray(refsResult) ? refsResult : (refsResult.items ?? refsResult.refs ?? []);
    const found = items.some((r) => stripVersionSuffix(r.wref ?? r.id) === asnWrefNoVer);
    if (!found) {
      failures.push({
        shape: shape.name,
        gate: '2b',
        reason: `data.${field}=${wref} does not return assertion ${asn.wref} via thing refs --inbound — relationship invisible from the ${field} endpoint side (typed-wref drift or index miss).`,
      });
    }
  }
}

function collectEndpointWrefs(collectionThing) {
  // Pair: { first, second }
  // Set: { members: [...] }
  // List: { items: [...] }
  const d = collectionThing?.data ?? {};
  const out = [];
  if (typeof d.first === 'string') out.push(d.first);
  if (typeof d.second === 'string') out.push(d.second);
  for (const arr of [d.members, d.items]) {
    if (Array.isArray(arr)) for (const v of arr) if (typeof v === 'string') out.push(v);
  }
  return out.map(stripVersionSuffix);
}

function checkRuntimeOneShape(shape, items) {
  if (items.length === 0) {
    // Distinguish "this is a Thing shape, not an assertion shape" (expected,
    // silent skip) from "this is an assertion shape but no instances yet"
    // (alpha-stage warning worth surfacing).
    let isThingShape = false;
    try {
      isThingShape = hasThingsOfShape(shape.name);
    } catch {
      // If the probe fails, fall back to emitting the warning rather than
      // hiding a potential issue.
    }
    if (!isThingShape) {
      warnings.push({ shape: shape.name, reason: '2b-partial: no assertions exist yet (alpha-stage)' });
    }
    return;
  }

  // Classify arity by aboutWref of sampled assertions. We use the first
  // assertion as the canonical arity witness; warn if assertions disagree.
  const cardinalities = new Set();
  for (const a of items) cardinalities.add(classifyAboutWref(a.aboutWref).kind);
  if (cardinalities.size > 1) {
    warnings.push({
      shape: shape.name,
      reason: `assertions disagree on aboutWref arity: ${[...cardinalities].join(', ')} — may indicate ingest drift`,
    });
  }

  for (const asn of items) {
    const cls = classifyAboutWref(asn.aboutWref);
    if (cls.kind === 'unknown') {
      failures.push({
        shape: shape.name,
        gate: '2b',
        reason: `assertion ${asn.wref} has unparseable aboutWref ${asn.aboutWref}`,
      });
      continue;
    }

    const aboutWref = stripVersionSuffix(asn.aboutWref);

    if (cls.kind === 'single') {
      // 2b for single-thing-about:
      //   (a) `wh thing about <aboutWref> --shape <Shape>` returns this
      //       assertion. Failure = assertion not reachable from its only
      //       about-target.
      //   (b) For every typed-wref data field, the target reports this
      //       assertion via `wh thing refs <target> --inbound`. Failure =
      //       typed-wref drift on the data field (the Violation-about-
      //       EnforcementCase + documentedByInspections case).
      let result;
      try {
        result = aboutEndpoint(aboutWref, shape.name);
      } catch (e) {
        failures.push({ shape: shape.name, gate: '2b', reason: `wh thing about ${aboutWref} failed: ${e.message}` });
        continue;
      }
      const asns = result?.assertions ?? [];
      const found = asns.some((x) => stripVersionSuffix(x.wref) === stripVersionSuffix(asn.wref));
      if (!found) {
        failures.push({
          shape: shape.name,
          gate: '2b',
          reason: `assertion ${asn.wref} not reachable from its own about target ${aboutWref}`,
        });
      }
      checkDataWrefReachability(shape, asn);
      continue;
    }

    // Pair / Set / List: resolve the collection thing, walk every endpoint,
    // and run two independent reachability checks per endpoint:
    //   1. `wh thing about <endpoint> --resolve-collections --shape <X>` returns
    //      this assertion. Failure here = the relationship is invisible from
    //      this side of the collection (the canonical four-direction failure).
    //   2. `wh thing refs <endpoint> --inbound` returns the collection thing.
    //      Failure here = the refs index has drifted; `thing about` may still
    //      work via aboutWref lookup but cross-cutting "what references this?"
    //      queries silently miss the relationship. Different bug class.
    let resolved;
    try {
      resolved = resolveCollectionEndpoints(aboutWref);
    } catch (e) {
      failures.push({ shape: shape.name, gate: '2b', reason: `wh thing view ${aboutWref} failed: ${e.message}` });
      continue;
    }
    const endpoints = resolved.endpoints;
    if (endpoints.length === 0) {
      if (resolved.needsFullRead) {
        // Summary-only body even after a forced full-data read — this is a
        // read-path limitation, not evidence the collection has zero
        // members. Warn instead of false-failing the four-direction test.
        warnings.push({
          shape: shape.name,
          reason: `collection ${aboutWref} (kind=${cls.kind}) returned a summary-only body even with --data-mode full; skipping the four-direction test for this collection instead of reporting zero endpoints`,
        });
      } else {
        failures.push({
          shape: shape.name,
          gate: '2b',
          reason: `collection ${aboutWref} (kind=${cls.kind}) yielded zero endpoint wrefs; cannot run four-direction test`,
        });
      }
      continue;
    }
    const collectionWrefNoVer = stripVersionSuffix(aboutWref);
    for (const endpoint of endpoints) {
      // Check 1: thing about --resolve-collections
      let aboutResult;
      try {
        aboutResult = aboutEndpoint(endpoint, shape.name);
      } catch (e) {
        failures.push({
          shape: shape.name,
          gate: '2b',
          reason: `wh thing about ${endpoint} --resolve-collections --shape ${shape.name} failed: ${e.message}`,
        });
      }
      if (aboutResult) {
        const asns = aboutResult.assertions ?? [];
        const found = asns.some((x) => stripVersionSuffix(x.wref) === stripVersionSuffix(asn.wref));
        if (!found) {
          failures.push({
            shape: shape.name,
            gate: '2b',
            reason: `endpoint ${endpoint} does not reach assertion ${asn.wref} via resolve-collections — relationship invisible from this side of the ${cls.kind}`,
          });
        }
      }

      // Check 2: thing refs --inbound returns the collection thing.
      // Confirms the refs index sees the wref in the collection's data; this is
      // the empirical "is the typed wref actually a typed wref" test that A2
      // calls out. A flat-string-encoded endpoint would NOT show up here.
      let refsResult;
      try {
        refsResult = inboundRefs(endpoint);
      } catch (e) {
        warnings.push({
          shape: shape.name,
          reason: `wh thing refs ${endpoint} --inbound failed: ${e.message}`,
        });
      }
      if (refsResult) {
        const items = Array.isArray(refsResult) ? refsResult : (refsResult.items ?? refsResult.refs ?? []);
        const found = items.some((r) => stripVersionSuffix(r.wref ?? r.id) === collectionWrefNoVer);
        if (!found) {
          failures.push({
            shape: shape.name,
            gate: '2b',
            reason: `endpoint ${endpoint} → collection ${aboutWref} is not reachable via wh thing refs --inbound. The refs index does not see this relationship — typed wref drift or index miss. Same-name assertions on flat-string fields would also fail here.`,
          });
        }
      }
    }
    // Collection-targeted relationships can also carry additional typed-wref
    // fields in data; check those the same way.
    checkDataWrefReachability(shape, asn);
  }
}

async function main() {
  let shapes;
  try {
    shapes = loadShapes();
  } catch (e) {
    console.error(`failed to load shapes: ${e.message}`);
    exit(2);
  }
  if (shapes.length === 0) {
    console.error('no shapes found');
    exit(2);
  }

  const targets = shapes.filter((s) => !TARGET_SHAPE || s.name === TARGET_SHAPE);
  const builtin = new Set(['Pair', 'Set', 'List']); // skip collection-builtins
  for (const shape of targets) {
    if (builtin.has(shape.name)) continue;

    // Schema-level smell (always; cheap):
    const schema = schemaSmells(shape);
    for (const s of schema) {
      failures.push({ shape: shape.name, gate: '2a', reason: `field ${s.name}: ${s.reason}` });
    }

    if (MANIFEST && !REPO) continue; // offline 2a only — no assertion sampling

    // Sample some assertions for both 2a data-smell and 2b runtime checks.
    let items;
    try {
      items = sampleAssertions(shape.name, SAMPLE_SIZE);
    } catch (e) {
      warnings.push({ shape: shape.name, reason: `assertion list failed: ${e.message}` });
      continue;
    }

    // 2a data-level smell — runs in both --dry-run and full mode.
    const dataIssues = dataSmells(shape, items);
    for (const d of dataIssues) {
      failures.push({
        shape: shape.name,
        gate: '2a',
        reason: `assertion ${d.assertion} field ${d.field}=${d.value}: ${d.reason}`,
      });
    }

    if (DRY_RUN) continue;
    checkRuntimeOneShape(shape, items);
  }

  report();
  exit(failures.length > 0 ? 1 : 0);
}

function report() {
  const mode = MANIFEST && !REPO ? '2a (manifest only)' : DRY_RUN ? '2a' : '2a+2b';
  if (failures.length === 0 && warnings.length === 0) {
    console.log(`Gate ${mode}: PASS`);
    return;
  }
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  [warn] ${w.shape}: ${w.reason}`);
  }
  if (failures.length > 0) {
    console.log(`\n${failures.length} failure(s):`);
    for (const f of failures) console.log(`  [${f.gate}] ${f.shape}: ${f.reason}`);
    console.log(`\nGate 2 (${mode}) FAILED — see checkpoint.md § Question 2.`);
  } else {
    console.log(`\nGate ${mode}: PASS (warnings only).`);
  }
}

main().catch((e) => {
  console.error(e.stack || e.message);
  exit(2);
});
