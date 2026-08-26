# Write Path

Collector apps write to WarmHub. Choose the path before implementing fields.

## Recommended Default: Handler-Mediated Writes

Use a deployed handler for most collectors:

1. Browser queues a submission envelope locally.
2. Browser posts the envelope to a project handler when online.
3. Handler validates identity, shape mapping, QC-at-ingress, rate limits, and anti-abuse signals.
4. Handler retains the accepted source envelope immutably with a canonical source digest before
   treating a write as complete.
5. Handler writes WarmHub things/assertions with server-side credentials, and retains each exact
   receipt plus any stream/submission identity with that source record.
6. Handler returns the terminal receipt outcome and recovery identity, not a made-up commit id.

This keeps WarmHub service credentials out of browser code and gives the project one place to evolve
validation and QC.

For a large add-only flush, use client-grouped JSONL: `wh commit submit --file
<group>.jsonl --stream-id <stable-source-group> --skip-existing -m "…"`, or `--stream` when the
input producer is replayable. `--stream-id` and `--skip-existing` are required for both JSONL
paths. Record the CLI-created submission UUID, or pass and record `--submission-id` when the
handler owns it.

## Direct SDK Writes

Use direct browser SDK writes only when all of these are true:

- the user has explicitly approved a browser write-token boundary;
- the token is narrow, short-lived, and scoped to the target repo/write path;
- the app can refresh or revoke credentials safely;
- the repo accepts the risk of client-side writes.

When any condition is unclear, use handler-mediated writes.

## Submission Envelope

The template emits this shape for handlers to adapt:

```json
{
  "schemaVersion": "warmhub.collector.submission.v1",
  "idempotencyKey": "stable client-generated id",
  "identity": {
    "mode": "anonymous-collector-instance | warmhub-account | hybrid",
    "subjectWref": "CollectorInstance/<id> or User/<id>",
    "collectorInstanceWref": "CollectorInstance/<id>"
  },
  "capturedAt": "ISO timestamp",
  "payload": {},
  "provenance": {},
  "qc": {
    "clientChecks": []
  }
}
```

## QC-at-Ingress

Start with:

- required field checks;
- allowed range checks;
- media type and size limits;
- location accuracy threshold if GPS is used;
- duplicate idempotency key rejection;
- rate limit per collector instance or user;
- review queue for low-trust public submissions when needed.

## Server Preview And Recovery

`wh commit submit --dry-run` and SDK validation execute the real server evaluator for one bounded
input, but they do not reserve state, consume a receipt, or create a submission identity. Use a
preview to surface shape and operation errors; re-check real-write results because concurrent
changes and write admission can still differ.

When a JSONL append response is ambiguous, stop the affected flush and look up its exact
`eventRequestId` with `wh commit receipt <event-request-id> --repo <org/repo>`. A receipt is the
outcome. Only opaque receipt-not-found permits a retry, which must preserve the original
submission id, stream id, message, and operation order. `--skip-existing` is for intentional
add-only reruns, not proof that an ambiguous append missed.

## Validation

- Offline submission remains queued after reload.
- Flush retries do not duplicate accepted submissions.
- Missing handler URL produces a visible setup error, not silent loss.
- Handler rejects malformed envelopes.
- WarmHub commit creates the expected things/assertions and provenance.
- Handler records the source digest, exact receipt, and any stream/submission identity before
  marking a queued submission complete.
- Browser bundle contains no WarmHub PAT or broad write credential.
