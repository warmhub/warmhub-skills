# Capture Rubric

Score each path from 0 to 3. Ask one high-impact question at a time when the manifest does not
answer an axis.

| Axis | Form | Media | Geolocation | Barcode or scan | Signature |
| --- | --- | --- | --- | --- | --- |
| Source fact type | structured observation | photo/audio/video evidence | place-based observation | asset/product/entity id | attestation |
| Device need | any phone | camera/mic | GPS permission | camera/scanner | touch screen |
| QC-at-ingress | required fields, ranges | file type/size, review | accuracy radius, geofence | checksum, known-prefix | signer metadata |
| Offline fit | high | medium, watch file size | high with cached maps | high | high |
| Abuse risk | low to medium | medium | spoofable without checks | medium | depends on identity |

## Identity Mode

Choose exactly one first:

- **Anonymous collector-instance** — default for low-friction surveys, field readings, and public
  contribution. Generate and persist a stable collector/device/app-instance id. Reputation and
  provenance attach to that collector identity.
- **WarmHub-account-attributed** — use when per-user provenance, access control, or user reputation is
  required. Require sign-in and submit through an auth-aware handler.
- **Hybrid** — start anonymous, then let a signed-in WarmHub user claim or associate the collector
  instance. Use only when both low-friction capture and later attribution matter.

## Offline Mode

- `none` — online-only, simplest path.
- `queue-only` — store submissions locally and retry on reconnect.
- `offline-first` — queue submissions, preserve media references, show sync state, and design for
  repeated field use.

## Public Posture

- `public` — anyone can submit; requires rate limiting and abuse checks.
- `invite-only` — shared link, team code, or private route; lower friction than full auth.
- `authenticated` — WarmHub account required.

## Output

Record the selected values in the manifest:

```json
{
  "collector": {
    "needed": true,
    "identityMode": "anonymous-collector-instance | warmhub-account | hybrid",
    "captureModes": ["form", "media", "geolocation"],
    "offlineMode": "none | queue-only | offline-first",
    "status": "planned"
  }
}
```
