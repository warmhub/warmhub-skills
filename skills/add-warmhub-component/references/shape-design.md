# Shape Design

Design component shapes so the manifest is small, ownership is obvious, and subscriptions do not
self-trigger unexpectedly.

## Core Rules

- model durable entities as thing shapes
- model derived facts or measurements as assertion shapes when appropriate
- keep trigger/input shapes separate from output/result shapes unless you intentionally want a loop
- prefer a small number of stable shapes over many highly-specific one-off shapes
- keep config in `ComponentConfig/<component-name>` when the component needs mutable settings

## Naming

The component id already namespaces ownership. Shape names do not have to be globally prefixed, but
prefixing can still help readability when collisions are likely.

Examples:
- unprefixed: `IncidentEvent`, `IncidentDigest`
- prefixed: `Id_IncidentEvent`, `Id_IncidentDigest`

Use the simplest convention that stays clear in the target repo.

## Input / Output Split

A common event-driven pattern:

```json
{
  "shapes": [
    {
      "name": "IncidentEvent",
      "fields": {
        "title": "string",
        "severity": "string",
        "reportedAt": "string"
      }
    },
    {
      "name": "IncidentDigest",
      "fields": {
        "summary": "string",
        "sourceEvent": "wref",
        "generatedAt": "string"
      }
    }
  ]
}
```

Then subscribe to `IncidentEvent` and write `IncidentDigest`.

## Config Shape Guidance

`ComponentConfig` is a built-in shared shape. Use a config thing when the action needs operator-set
values or feature flags.

```json
{
  "seeds": [
    {
      "kind": "thing",
      "shape": "ComponentConfig",
      "name": "incident-digest",
      "data": {
        "enabled": true,
        "minimumSeverity": "high",
        "maxItems": 20
      }
    }
  ]
}
```

Do not declare `ComponentConfig` in `manifest.shapes`; it is system-managed.

## Practical Checklist

Before freezing the manifest, verify:
- each shape has a clear purpose
- each subscription trigger shape has a separate output destination
- config is either a built-in `ComponentConfig` thing or a clearly owned custom shape
- action code can derive every needed field from declared shapes and config
