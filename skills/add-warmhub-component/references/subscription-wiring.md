# Subscription Wiring

Subscriptions connect a manifest trigger to a `webhookUrl` you operate. There is no manifest
`actions` array — the subscription delivers directly to the handler endpoint.

## Event Subscription

Use for reactive components that process new or changed things/assertions.

```json
{
  "subscriptions": [
    {
      "name": "incident/process-event",
      "trigger": {
        "kind": "event",
        "shape": "IncidentEvent",
        "filter": { "shape": "IncidentEvent" }
      },
      "webhookUrl": "https://handler.example.com/incident/process"
    }
  ]
}
```

Notes:
- `trigger.shape` is required for event triggers
- `filter` is optional; if omitted, the installer/runtime defaults to the shape filter
- `webhookUrl` must be a public HTTPS endpoint (no localhost / private IPs)
- keep names stable and scoped, e.g. `incident/process-event`

## Cron Subscription

Use for scheduled syncs or maintenance work. Minimum interval is 5 minutes.

```json
{
  "subscriptions": [
    {
      "name": "incident/nightly-digest",
      "trigger": {
        "kind": "cron",
        "cronspec": "0 6 * * *",
        "timezone": "UTC"
      },
      "webhookUrl": "https://handler.example.com/incident/nightly"
    }
  ]
}
```

WarmHub fires cron subscriptions on schedule and delivers an `event: "warmhub.cron"` POST to the
`webhookUrl` automatically.

## Credentials On Subscriptions

To authenticate inbound deliveries, bind a credential set with `WEBHOOK_*` keys:

```json
{
  "subscriptions": [
    {
      "name": "incident/process-event",
      "trigger": { "kind": "event", "shape": "IncidentEvent" },
      "webhookUrl": "https://handler.example.com/incident/process",
      "credentials": ["digest-runtime"]
    }
  ]
}
```

Current runtime constraint: one credential set per subscription.

## Health And Teardown

Declare the subscriptions that must exist and how teardown should treat them.

```json
{
  "health": {
    "requires": {
      "subscriptions": [
        "incident/process-event",
        "incident/nightly-digest"
      ]
    }
  },
  "teardown": {
    "subscriptions": {
      "onDisable": "pause",
      "onUninstall": "pause"
    }
  }
}
```

Recommended default:
- `onDisable: "pause"`
- only use `onUninstall: "delete"` when you are confident the subscription should disappear
  completely rather than pause for later recovery

## Wiring Checklist

Before installing, confirm:
- every subscription has a public HTTPS `webhookUrl`
- event subscriptions watch the intended input shape
- output writes land in a different shape unless a loop is deliberate
- secret-backed subscriptions bind exactly one credential set
- health requires the subscriptions you expect to stay active
- teardown policy matches the operator expectation for disable vs uninstall
