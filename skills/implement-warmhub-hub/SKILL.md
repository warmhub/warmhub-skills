---
name: implement-warmhub-hub
description: Turn an existing WarmHub repository, or an existing API, into a working hub on the WarmHub answer exchange, so agents can ask it questions and its curator gets paid per answer. Use when someone asks to build, implement, add or ship a hub, write a hub's toolset, intents or golden questions, put a WarmHub repo on the exchange, or put a hub in front of an API. Not for designing the repository itself (use design-warmhub-repo) or loading data into it (use build-warmhub-repo).
---

# Implement a WarmHub hub

A **hub** answers consumers' questions from one WarmHub repository, from an outside API its tools call, or from both. Its **toolset** is a manifest plus tools, versioned in the hub's own toolset repository; each commit on `main` is a toolset. You build it for the hub's **curator**, who owns the repository and is paid for its answers.

Decide with the curator where the answers come from:
- **The data is already in a WarmHub repository:** build on it.
- **The curator has an API that answers each question in one or two calls:** build the hub in front of it (step 4, "When the answer comes from an API"). Do this when the data changes too often to copy, is too large, or must stay at its source.
- **Neither:** stop and build a repository first: `design-warmhub-repo`, then `build-warmhub-repo`. A domain under about 100k records usually goes into a graph in one pass. Choose this too when questions need search, counts or joins the API can't give.

Every hub is registered on a WarmHub repository, so a hub in front of an API still needs one. It can hold little or nothing. If the curator has none, ask them to create one before step 1: `wh-curator register` fails without it.

## Done means
- The hub is registered, and a toolset is staged, granted, and passes its examples run and its golden run.
- `wh-curator prove --json` exits 0.
- You asked the curator to activate it, and reported: Hub ID, the commit, run IDs, each intent (built or planned) with an example question, known misses, and what the hub can't answer.

## Rules
- **The curator activates, lists and rolls back. You never do.**
- **Never mint, read, print or store a token.** `wh-curator` holds them. Never run `wh-curator logout`: it ends every grant.
- **Ask the curator before** writing to their WarmHub repository, and before the first grant.
- Run every command with `--json` and trust the exit code. On failure, follow the `hint` in the error.
- Work only in the hub's toolset repository and in WarmHub.

## 1. Set up
```bash
npm install -g @warmhub/curator @warmhub/cli
wh-curator doctor --json
wh-curator login --org <org> --json      # prints a sign-in link and code: give both to the curator
wh-curator register <org>/<repo> --json  # registers the hub, clones ./<repo>-hub
```
Work inside the clone from here. Its `AGENTS.md` is the full reference: read it before you design, and go back to it whenever this page is too short.

## 2. Learn the data, then the questions
1. **Survey** with `wh repo describe <org>/<repo> --indexed-fields`, `wh shape list`, `wh shape view`, `wh thing list --shape`. Note what each Shape holds, how Things are named, which fields are indexed, and how stored values differ from how people type them. For an API, read its docs and a few real responses: which endpoints answer the questions, what a missing item returns (a 404, or an empty list), its rate limits, and the hostname every call goes to.
2. **Write 15–30 real questions** in a person's words, not the schema's. Ask the curator who the consumers are and which questions matter most. Also write the questions people will ask that the data can't answer.

## 3. Design before you build
Design mistakes cost answers that no tool fix recovers. Show the curator the design and build only what they agree to.
- **Intents:** one intent is one kind of question: same parameters, same tool, same kind of answer. Five to ten is a good first toolset. Build the ones that matter most; leave the rest with `tool: null`, which answers `NotImplemented` and still teaches routing.
- **Descriptions:** an intent's description is all the router model sees. Say what it answers, what it needs, what it doesn't cover, and give two or three phrasings.
- **`scope` and `notInScope`:** one sentence each. `notInScope` names data the hub doesn't hold, never a kind of question.
- **Parameters:** a Thing with its own Shape is an entity; a name many Things share is text; a small fixed set is a choice. `required` only if the tool can't answer without it.
- **Check:** for every question, name the intent that takes it or the `notInScope` phrase that declines it. Every intent must be answerable with a few indexed reads, or one or two API calls, inside the 20-second dispatch.

## 4. Build
- **Manifest** (`src/manifest.ts`): the hub, `scope`, `notInScope`, `reads`, entities, intents.
- **Tools** (`src/tools/<intent>.ts`): use only the Tool SDK in `sdk/`. Read WarmHub only through `WarmHubReader`, on indexed fields, never an unbounded set. Return `Answer` or `NotFound`, or fail with a typed error; never throw. No module-level state.
- **Examples:** two to five per built intent, in natural phrasings. They decide which questions reach the hub.
- **Golden questions:** three to five per intent, different from the examples, plus the edges: `MissingParameters`, `NotImplemented`, `OutOfScope`, `NotFound`.
- Every value an example or golden question names must be in the data. Check it with `wh`, or against the API's real responses; never invent one.

### When the answer comes from an API
A tool can answer from an outside API instead of WarmHub, or as well as it. The clone's `AGENTS.md` has the detail in sections 10, 11 and 19.
- **Allow the host:** list each hostname the tools call in the manifest's `egress.allow`. A tool reaches only HTTPS GET, HEAD and POST on those hosts.
- **Call it with `fetchJson(url, schema, { service })`** from the Tool SDK. It decodes the body with your Schema and gives `Option.none()` on a 404 or a 204, which you answer with your own `notFound`. Don't retry inside the tool: it spends the dispatch's 20 seconds.
- **POST only to read,** as a GraphQL API does. Never send a mutation. Write the query in the tool and pass the consumer's words only as variables.
- **Check who may see the answers.** A listed hub answers anyone signed in, with data fetched under the curator's key. Before any key is set, ask the curator to confirm that everything the tools can fetch may be shown to the hub's consumers. If not, narrow what the tools fetch, or have the curator restrict the hub's audience in Curator Studio before listing.
- **API keys are the curator's.** Ask them to set each host's key before the first test run, with `wh-curator secrets set <host> --credential <file>` inside the clone; `wh-curator secrets template static` prints the body to fill in. Never put a key in the code or in a URL, and never ask for one in the chat.
- **Parameters:** a value only the API knows is text, not an entity. An entity is a Thing in WarmHub.
- **Shapes:** declare the answer's Shapes in the manifest's `shapes`, and add what only the API knows with `localThing(shape, data, id)`.
- **Provenance:** cite the API as `{ label, url }`, where `url` is a public page about the source, never the URL the tool requested.
- **Tests:** stub `fetch`, so a tool's tests never call the API.

## 5. Ship until it passes
```bash
wh-curator ship --json -m "<what changed>" [--grant]
```
It builds, commits, pushes, stages, grants, and runs the examples and the golden questions. The first ship stops with `ConsentRequired`: ask the curator, then pass `--grant` from then on.

Read every miss and fix the step where the question went wrong:

| Miss | Fix |
|---|---|
| Wrong intent, or a wrong decline | Descriptions, `scope`, `notInScope`, examples |
| `MissingParameters` where you expected an answer | Parameter or entity declarations |
| `NotFound`, or a `HubError` at `Tool` | The tool, or for an API the host's `egress.allow` entry and its key |
| `HubError` at `Validate` or `ToolContract` | The answer Shapes |

Don't change a golden question to make it pass unless the expectation was wrong, and say so if you do. The router model isn't deterministic: recheck one question with `wh-curator prove "<question>" --json` rather than shipping again (a hub gets 40 test runs an hour, and each ship uses two).

## 6. Hand over
When `ship` and `prove` both exit 0, ask the curator to activate the commit `ship` printed, in Curator Studio (`https://studio.warmhub.ai`), and make your case with the runs and known misses. Leave the clone clean, and report as "Done means" says.
