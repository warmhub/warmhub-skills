#!/usr/bin/env node
// Verify-catalog: reconciles a manifest's shape set against a query-catalog file.
// Implements checkpoint Gate 1 (every shape cites at least one question) as a deterministic check.
//
// Usage:
//   node verify-catalog.mjs --repo <org/name> --catalog <path/to/catalog.md>
//   node verify-catalog.mjs --shapes <comma-sep-list> --catalog <path>   (offline mode)
//
// Checks performed:
//   1. Every shape in the repo (or --shapes list) appears on at least one
//      "Earns pressure for: ..." line in the catalog.
//   2. Every Q-ID (Q§.N) found in the catalog earns at least one shape
//      (i.e., its "Earns pressure for" line is non-empty and lists shapes
//      that exist in the manifest).
//
// Exits non-zero on any gap with a one-line summary per failure.
// Designed to compose into pre-publish workflows alongside verify-relationships.

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { argv, exit } from 'node:process';

const args = parseArgs(argv.slice(2));
if (!args.catalog) usage('--catalog is required');
if (!args.repo && !args.shapes) usage('one of --repo or --shapes is required');

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
  console.error('usage: verify-catalog.mjs (--repo <org/name> | --shapes <a,b,c>) --catalog <path>');
  exit(2);
}

function getShapesFromRepo(repo) {
  const r = spawnSync('wh', ['shape', 'list', '--repo', repo, '--json'], { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`wh shape list failed: ${r.stderr || r.stdout}`);
  }
  const data = JSON.parse(r.stdout);
  const items = Array.isArray(data) ? data : (data.items ?? []);
  return items.map((s) => s.name);
}

function getShapes() {
  if (args.shapes) return args.shapes.split(',').map((s) => s.trim()).filter(Boolean);
  return getShapesFromRepo(args.repo);
}

function parseCatalog(text) {
  // Extract Q-IDs and their "Earns pressure for" / "Earns" lines.
  //
  // A Q-ID is either a literal placeholder `Q§.N` (used in templates) or a
  // dotted-numeric form `Q<int>.<int>` with an optional trailing lowercase
  // letter (e.g. Q1.2, Q3.14a). We require a heading to start with `Q`
  // followed by either `§.N` or a digit then `.` then another digit; this
  // prevents matching unrelated text like `Q4 sales final.xlsx` or a heading
  // such as `### Q4 review notes`.
  //
  // Format expected (per query-catalog-template.md):
  //   ### Q§.N — <question>
  //   ...
  //   Earns pressure for: Shape1, Shape2
  //   <or>  Earns: ShapeA — <free-form prose continuing the sentence>
  //
  // Shape extraction:
  //   - Split the right-hand side on commas / semicolons.
  //   - Strip backticks.
  //   - Cut at the first terminal-prose marker (em dash, period, colon).
  //   - Keep only tokens that look like valid shape names: a CamelCase
  //     identifier or dotted name `Foo.Bar`. Drop anything else (which is
  //     prose continuation, not a shape name).
  const qPattern = /^#{1,6}\s+(Q(?:§\.[N\d]+|\d+\.\d+[a-z]?))\b\s*[—\-:]?\s*(.*)$/;
  const earnsPattern = /^Earns(?:\s+pressure\s+for)?:\s*(.+)$/i;
  const lines = text.split('\n');
  const entries = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    const qm = raw.match(qPattern);
    if (qm) {
      if (current) entries.push(current);
      current = { id: qm[1], heading: qm[2], earns: [] };
      continue;
    }
    if (!current) continue;
    const em = line.match(earnsPattern);
    if (em) {
      const shapes = em[1].split(/[,;]/).map(extractShapeName).filter(Boolean);
      current.earns.push(...shapes);
    }
  }
  if (current) entries.push(current);
  return entries;
}

function extractShapeName(segment) {
  // Take one comma-separated segment from an "Earns" line and pull out the
  // shape name (if any). Strip code fences and backticks; cut at terminal
  // prose markers; accept only CamelCase or dotted-identifier tokens.
  let s = segment.replace(/`/g, '').trim();
  // Cut at terminal prose markers — em dash, en dash, period (followed by
  // space), colon, exclamation/question mark.
  const cutMatch = s.match(/^([^—–.:!?]+?)(?:\s*[—–.:!?]|$)/);
  if (cutMatch) s = cutMatch[1].trim();
  // Take leading shape-name token. Valid shape names look like a capitalized
  // identifier optionally followed by `.identifier` segments. Reject prose.
  const nameMatch = s.match(/^([A-Z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*)/);
  if (!nameMatch) return null;
  return nameMatch[1];
}

function main() {
  const catalogText = readFileSync(args.catalog, 'utf8');
  const entries = parseCatalog(catalogText);
  if (entries.length === 0) {
    console.error(`no Q-headings found in ${args.catalog}`);
    exit(2);
  }

  const shapes = getShapes();
  const shapeSet = new Set(shapes);

  // Build reverse index: shape → [Q-IDs that earn it]
  const shapeToQs = new Map();
  for (const e of entries) {
    for (const s of e.earns) {
      if (!shapeToQs.has(s)) shapeToQs.set(s, []);
      shapeToQs.get(s).push(e.id);
    }
  }

  const failures = [];
  const warnings = [];

  // Check 1: every shape appears on at least one Earns line.
  for (const s of shapes) {
    if (!shapeToQs.has(s)) {
      failures.push(`shape "${s}" earns no question in the catalog`);
    }
  }

  // Check 2: every Q-ID must earn at least one shape that EXISTS in the manifest.
  // A Q-ID that names only non-manifest shapes is a failure (typo, unimplemented,
  // or retired without removing from the catalog) — it claims to earn pressure
  // for something the graph cannot deliver.
  for (const e of entries) {
    if (e.earns.length === 0) {
      failures.push(`question "${e.id}" lists no shapes on its "Earns pressure for" line (or the line is missing)`);
      continue;
    }
    const matched = e.earns.filter((s) => shapeSet.has(s));
    const missing = e.earns.filter((s) => !shapeSet.has(s));
    if (matched.length === 0) {
      failures.push(`question "${e.id}" earns no shape that exists in the manifest (listed: ${e.earns.join(', ')})`);
    } else {
      for (const s of missing) {
        warnings.push(`question "${e.id}" lists shape "${s}" which is not in the manifest (typo? unimplemented? retired?)`);
      }
    }
  }

  // Report
  console.log(`Checked ${shapes.length} shapes against ${entries.length} catalog questions.\n`);
  if (warnings.length > 0) {
    console.log(`${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  [warn] ${w}`);
    console.log();
  }
  if (failures.length > 0) {
    console.log(`${failures.length} failure(s):`);
    for (const f of failures) console.log(`  [fail] ${f}`);
    console.log(`\nGate 1 (question-coverage) FAILED — see checkpoint.md § Question 1.`);
    exit(1);
  }
  console.log('Gate 1 (question-coverage): PASS');
}

try {
  main();
} catch (e) {
  console.error(e.stack || e.message);
  exit(2);
}
