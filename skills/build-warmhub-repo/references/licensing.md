# Repository License Declaration

Use this workflow only for the repository-wide declaration. It helps the user record and verify a
sourced choice; it does not select a license, interpret legal effects, or establish suitability. If
the user is uncertain, leave the repo undeclared and direct them to their organization policy or
qualified counsel.

## 1. Inspect before asking or writing

Start with the first-class read surface:

```bash
wh repo describe <org>/<repo> --json
```

Branch on the top-level `license` value.

### Existing declaration

When `license` is an object, show the user its `spdxId`, `spdxExpression`, `appliesTo`,
`attributionText`, `declaredBy`, `sourceUrl`, and `licenseWref`. These are declaration data and
provenance, not proof of legal suitability. Preserve the declaration unless the user explicitly
confirms replacement. If they decline replacement, make no write and continue to the alignment
check.

### Undeclared repository

When `license` is `null`, tell the user there is no declared repository license. Ask for an exact
SPDX identifier or expression, or let the user explicitly defer. Never insert a default or infer a
license from visibility, source code, dependencies, or nearby repos. A decision to remain undeclared
is a valid completion state: record it and make no declaration write.

### Confirm the payload

Before any write, show one final payload summary and require explicit human confirmation of:

- the exact SPDX identifier or compound expression;
- that `LicenseSubject/repo` represents the entire repo, plus `appliesTo` and any scope caveat;
- `declaredBy`;
- the upstream `sourceUrl` when the repo redistributes material;
- exact `attributionText`, when required; and
- any other note.

Omit optional fields the user did not confirm. Never synthesize attribution, provenance, scope
claims, or legal conclusions.

## 2. Inspect the native instance state

`LicenseSubject` and `LicenseDeclaration` are native lazy built-ins. Do not install a component or
require the shapes to exist before the first declaration. Read the two exact well-known instances:

```bash
wh thing view LicenseSubject/repo --repo <org>/<repo> --json
wh assertion view LicenseDeclaration/repo --repo <org>/<repo> --json
```

Treat a not-found result as absence only for that exact instance. Never treat authorization,
network, or other system errors as evidence that an instance is absent.

Classify the result before writing:

- If neither instance exists, submit the subject and declaration together in one atomic commit.
  The ordinary commit lazily materializes both native shapes.
- If only the valid subject exists, add only the declaration in one commit.
- If both exist and are valid, preserve the declaration or follow the guarded-revision path after
  explicit replacement confirmation.
- If only the declaration exists, stop and report the inconsistent state.
- If either exact wref exists with the wrong kind, shape, scope, or target, stop and report the
  conflict. `LicenseSubject/repo` must be a `LicenseSubject` thing with `scope: "repo"`;
  `LicenseDeclaration/repo` must be a `LicenseDeclaration` assertion about
  `LicenseSubject/repo`.

If a commit reports a native-shape name conflict, stop and report it. Do not rename or replace an
existing shape without a separately approved migration. Create only that well-known repo-scope
assertion about `LicenseSubject/repo`; do not create a second repo-wide declaration.

## 3. Resolve the confirmed license form

### One SPDX identifier

Resolve the exact identifier against the canonical substrate:

```bash
wh thing view "License/<SPDX-ID>" \
  --repo warmhub-data/global.reference.licenses --json
```

Stop if lookup fails or `data.spdxId` is not an exact match. Take the returned pinned local wref,
such as `License/MIT@v2`, and form the absolute canonical value by prefixing
`wh:warmhub-data/global.reference.licenses/`. Re-read that absolute pinned wref before the write.
Store the verified absolute pinned value in `licenseWref`; never store a floating or unresolved wref.
Set `spdxIdRaw` to the confirmed identifier and omit `spdxExpression` unless the user confirmed it.

The substrate is source-backed reference information, not legal advice. Its raw metadata, cited
URLs, and full text may help the user inspect a candidate, but do not convert them into a legal
effects summary or recommendation.

### Compound SPDX expression

When the confirmed value contains `OR`, `AND`, or `WITH`, preserve it verbatim in
`spdxExpression`, and use the same confirmed raw value for required `spdxIdRaw`. Omit
`licenseWref`; one constituent must not falsely represent the complete expression. Do not normalize,
reorder, or rewrite the expression.

### Unknown or custom terms

Never put an unresolved identifier in `licenseWref`. Ask the user whether to defer or explicitly
confirm a custom/raw declaration and authoritative text. For a confirmed raw declaration, preserve
the exact value in required `spdxIdRaw`, include `spdxExpression` only when the user explicitly
confirmed it as an expression, and omit `licenseWref`. Expect `wh repo describe` to return
`licenseWref: null`.

## 4. Add once or revise with a version guard

Build the declaration `data` from the native fields and only the values confirmed in sections 1 and
3. `spdxIdRaw` is required. The optional fields are `licenseWref`, `spdxExpression`, `appliesTo`,
`attributionText`, `declaredBy`, `sourceUrl`, and `note`; omit every unconfirmed optional field.

When neither instance exists, write this atomic operation file using the confirmed declaration data:

```json
[
  {
    "operation": "add",
    "kind": "thing",
    "name": "LicenseSubject/repo",
    "data": { "scope": "repo" }
  },
  {
    "operation": "add",
    "kind": "assertion",
    "name": "LicenseDeclaration/repo",
    "about": "LicenseSubject/repo",
    "data": { "spdxIdRaw": "<confirmed-id-or-expression>" }
  }
]
```

Add confirmed optional fields to the second operation's `data`, following section 3 exactly. Submit
both operations together:

```bash
wh commit submit --file license-declaration.ops.json \
  -m "declare repository license" --repo <org>/<repo>
```

If only the valid subject exists, remove the subject operation and submit only the declaration add.
For a confirmed replacement, first inspect the active assertion:

```bash
wh assertion view LicenseDeclaration/repo --repo <org>/<repo> --json
```

Use its current version and a complete, reconfirmed native data object in the concurrency-aware
write:

```bash
wh commit submit --revise LicenseDeclaration/repo --kind assertion \
  --data '<confirmed-complete-data-json>' --expected-version <current-version> \
  -m "revise repository license" --repo <org>/<repo>
```

Do not use add/retract churn or an unguarded assertion revision. If the version check fails, re-read
the current declaration and ask the user to confirm against the changed state before retrying.

## 5. Verify machine and UI surfaces

After a successful write, always run:

```bash
wh thing view LicenseSubject/repo --repo <org>/<repo> --json
wh assertion view LicenseDeclaration/repo --repo <org>/<repo>
wh repo describe <org>/<repo> --json
```

As a supplemental policy check, run doctor only for a public repository:

```bash
wh --repo <org>/<repo> doctor
```

Private repositories intentionally have no repository-license doctor check. For them, the exact
subject read, assertion read, and `repo describe` are the complete machine verification. Do not
interpret the absence of a private-repo doctor result as missing verification.

Verify that the assertion is active and about `LicenseSubject/repo`. The describe `license` block
must match every confirmed field. It must expose the canonical pinned `licenseWref` for a single
SPDX identifier and `licenseWref: null` for a compound or custom/raw declaration. Treat any mismatch
as failed verification.

When the web UI is available, show the user the License header badge and panel. Confirm that a
single identifier links to its canonical thing and a compound expression displays verbatim without
a false canonical link.

## 6. Align README and root LICENSE

Treat `LicenseDeclaration/repo` as the machine truth. Update the README license section to match the
confirmed declaration, publish it, and compare the readback with the local file:

```bash
wh repo content set <org>/<repo> --kind readme --file README.md
wh repo content get <org>/<repo> --kind readme
```

For a single SPDX declaration, copy `data.fullText` from the exact pinned substrate thing verbatim to
root `LICENSE`; do not paraphrase, rewrite, or fill placeholders in the canonical text. Keep any
user-confirmed copyright or attribution notice separate unless its authoritative source explicitly
includes it in the license text. For compound or custom terms, use only authoritative text explicitly
approved by the user; do not concatenate constituent license texts as though that creates a valid
compound license document. If authoritative text is not available, leave `LICENSE` unchanged and
report the follow-up.

Finally compare the graph declaration, README section, and root `LICENSE`. Report every mismatch;
do not silently edit one surface into apparent agreement or call the repo aligned while a follow-up
remains.

## 7. Record the receipt

In project state and the final handoff, record `declared`, `preserved`, or `deferred`; the confirmed
raw id/expression when declared; the assertion version; native instance transition
(`created-subject-and-declaration`, `created-declaration`, `preserved`, or `revised`); verification
commands; UI evidence when available; and any README or root `LICENSE` mismatch. Never record a
defer as a failed build.
