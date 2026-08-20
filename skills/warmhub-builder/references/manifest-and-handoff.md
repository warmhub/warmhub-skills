# Manifest And Handoff

The coordinator initializes the project-state manifest. Stages update it.

Default path:

```text
.warmhub-builder/project-state.json
```

Use another path only when the user approves it or the run spans several repositories.

## Minimal Manifest

```json
{
  "schemaVersion": "warmhub-builder.project-state.v1",
  "project": {
    "idea": "",
    "audience": "",
    "storyGoals": [],
    "constraints": [],
    "sensitivity": "unknown",
    "selectedShape": "data-only"
  },
  "warmhubRepo": {
    "repo": "",
    "repoState": "unknown",
    "attributionUrl": ""
  },
  "repoDesignSummary": {
    "shapeInventory": [],
    "identityModel": "",
    "assertionModel": [
      {
        "shape": "",
        "fact": "",
        "aboutCardinality": "single",
        "aboutTarget": "",
        "fourDirection": {
          "subject": "blocked",
          "object": "not-applicable",
          "aggregation": "blocked",
          "derivedRollup": "not-applicable",
          "notes": ""
        },
        "provenance": "",
        "pitfallsChecked": []
      }
    ],
    "updateCadence": "",
    "writeModel": "",
    "qcModel": "",
    "sensitivity": "unknown"
  },
  "ingestion": {
    "sources": [],
    "idempotency": "",
    "backfill": "",
    "automation": [],
    "status": "not-planned"
  },
  "component": {
    "installed": false,
    "componentId": "",
    "healthStatus": "unknown",
    "required": []
  },
  "collector": {
    "needed": false,
    "identityMode": "unknown",
    "captureModes": [],
    "offlineMode": "none",
    "status": "not-needed"
  },
  "display": {
    "needed": false,
    "surface": "unknown",
    "demoUrl": "",
    "status": "not-needed"
  },
  "validationReceipts": [],
  "finalHandoff": {
    "artifacts": [],
    "reproduceSteps": [],
    "demoUrls": [],
    "caveats": [],
    "remainingHumanDecisions": []
  },
  "handoffs": []
}
```

Set `collector.needed`, `display.needed`, and `warmhubRepo.repoState` from the selected shape.
When the user names required WarmHub components or runtimes, add them to `component.required` and
leave `component.installed` false until the component is installed and health-checked on the target
repo.
Use `public-safe`, `internal`, `private`, or `unknown` for sensitivity. If input uses a combined
non-public label, choose the more precise value before writing the manifest.
Append validation commands, blocked checks, skipped live checks, and fallback notes to
`validationReceipts`. Use `finalHandoff` only for terminal reproduce/demo/caveat material, not for
intermediate routing.

## Handoff Entry

Append a lightweight handoff entry whenever the coordinator routes:

```json
{
  "from": "warmhub-builder",
  "to": "design-warmhub-repo",
  "reason": "new repo needs data model before build",
  "manifestUpdated": ".warmhub-builder/project-state.json",
  "capabilityFallbackUsed": "",
  "blockingQuestions": []
}
```

## Next-Step Block

End every coordinator run with:

```text
Next step:
- Recommended: <one next stage or action>
- Alternatives: <short list of valid next stages/actions>
- Manifest updated: <path>
- Ready for: <stage-name or human decision>
- Blocking questions: <none or concise list>
```

Rules:

- Include exactly one recommended next step.
- Keep alternatives valid for the selected shape.
- Point to the manifest path every time.
- Name blocking questions explicitly.
- If the recommended stage is not installed, make the recommended action a copy-pasteable prompt
  that invokes the missing stage by name.
