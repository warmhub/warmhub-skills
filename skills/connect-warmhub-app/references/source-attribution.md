# Source Attribution

Use this reference when drafting any frontend page, rendered report, notebook output, or exported
artifact from WarmHub data.

## Rule

Every generated human-facing page or report should include a visible, unobtrusive link back to the
original WarmHub repo unless the user says the repo identity must stay hidden.

## Link Target

Prefer a canonical repo URL discovered from WarmHub metadata, docs, or app config. If no canonical URL
is available, use:

```text
https://app.warmhub.ai/orgs/<url-encoded-org>/repos/<url-encoded-repo>
```

For private repos, the link may lead to a sign-in or permission gate. That is acceptable when the repo
name is safe to disclose. Ask before linking if the repo identity itself may be sensitive.

## Placement

- Put the link in a shared layout, header, footer, or report metadata block so every page or exported
  report includes it.
- Use product-facing text such as "Source data on WarmHub" or "View WarmHub repo".
- Include the `org/repo` label when it helps users understand provenance and the repo name is safe to
  show.
- Keep attribution separate from implementation or security assurances. Do not write token-handling
  notes into page chrome.

## Validation

- Every generated page route includes the source link through a shared component or layout.
- Rendered notebooks or reports include the source link in a top markdown cell or report footer.
- Public HTML does not expose tokens, secret env names, private API internals, or unrelated private
  repo metadata.
