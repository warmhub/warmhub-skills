# Write Path

Collector apps write to WarmHub. Choose the path before implementing fields.

## Recommended Default: Handler-Mediated Writes

Use a deployed handler for most collectors:

1. Browser queues a submission envelope locally.
2. Browser posts the envelope to a project handler when online.
3. Handler validates identity, shape mapping, QC-at-ingress, rate limits, and anti-abuse signals.
4. Handler writes WarmHub things/assertions with server-side credentials.
5. Handler returns a receipt with commit id, accepted/rejected status, and retry guidance.

This keeps WarmHub service credentials out of browser code and gives the project one place to evolve
validation and QC.

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

## Validation

- Offline submission remains queued after reload.
- Flush retries do not duplicate accepted submissions.
- Missing handler URL produces a visible setup error, not silent loss.
- Handler rejects malformed envelopes.
- WarmHub commit creates the expected things/assertions and provenance.
- Browser bundle contains no WarmHub PAT or broad write credential.
