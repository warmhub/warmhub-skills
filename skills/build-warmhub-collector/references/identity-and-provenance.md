# Identity And Provenance

Collector submissions need a reputation-bearing subject and a provenance trail. Treat collector
identity as part of the data model, not UI state.

## Anonymous Collector-Instance

Use when the user wants low-friction collection without sign-in.

- Generate a stable random id on first launch and persist it locally.
- Model the subject as a collector/device/app instance, for example `CollectorInstance/<id>`.
- Use that subject in submission provenance and reputation fields.
- Include device/app metadata that is useful for QC without exposing sensitive identifiers.
- Allow later claim/association by a WarmHub user only if the project wants hybrid attribution.

Recommended provenance shape:

```json
{
  "identityMode": "anonymous-collector-instance",
  "collectorInstanceWref": "CollectorInstance/<id>",
  "submittedAt": "ISO timestamp",
  "appVersion": "collector app version",
  "deviceLabel": "optional user-visible label",
  "location": { "lat": 0, "lng": 0, "accuracy": 0 }
}
```

## WarmHub-Account-Attributed

Use when each submission must attach to a signed-in WarmHub user.

- Require account sign-in before submission, or before flush if offline capture is allowed.
- Keep per-user write credentials server-side or use a short-lived token boundary approved by the app
  connection stage.
- Key provenance and reputation to the WarmHub user identity, with device metadata as supporting
  evidence.

Recommended provenance shape:

```json
{
  "identityMode": "warmhub-account",
  "userWref": "User/<id>",
  "collectorInstanceWref": "CollectorInstance/<id>",
  "submittedAt": "ISO timestamp",
  "appVersion": "collector app version"
}
```

## Hybrid

Use when anonymous field collection should later be claimed by a user.

- Keep the collector-instance subject on every raw submission.
- Add a separate claim/association assertion when a user signs in.
- Do not rewrite historical provenance; append the association so review/audit trails stay stable.

## Validation

- A new browser install creates exactly one stable collector-instance id.
- Clearing local app data creates a new collector instance.
- Submissions include exactly one primary reputation subject.
- Attribution mode is visible to operators or reviewers, not hidden in ad hoc notes.
- The ingestion plan names the collector as a `human-collection` source.
