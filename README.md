# warmhub-skills

WarmHub skills for Claude Code, Codex, and other AI coding agents.

## Install

### Any agent via `npx skills add`

Run these commands from the project directory where you want the skills installed.

```bash
cd ~/my-project

# Browse available skills
npx skills add warmhub/warmhub-skills --list

# Install everything
npx skills add warmhub/warmhub-skills --all

# Install a single skill
npx skills add warmhub/warmhub-skills --skill build-warmhub-repo

# Target a specific agent
npx skills add warmhub/warmhub-skills --all -a codex
```

You can also smoke-test a local clone:

```bash
npx skills add /path/to/warmhub-skills --list
```

### Local install scripts

The repo also ships local installer scripts for direct symlink/copy installs.

```bash
# All skills into a Claude Code project
./scripts/install-skills.sh --project /path/to/repo

# A single skill into a Claude Code project
./scripts/install-skills.sh --project /path/to/repo --skill build-warmhub-repo

# All skills into personal Claude Code skills
./scripts/install-skills.sh --claude-personal

# All skills into Codex
./scripts/install-skills.sh --codex-personal

# Copy instead of symlink
./scripts/install-skills.sh --project /path/to/repo --mode copy
```

The old Claude-only wrapper still works:

```bash
./scripts/install-claude-skills.sh --project /path/to/repo
```

**Claude Code discovery paths:** Claude Code reads skills from `~/.claude/skills/` (personal)
and `.claude/skills/` (project). Symlinks must be created **per skill directory**
(`.claude/skills/<skill-name>` → the skill dir), not by symlinking the parent `skills/`
folder — the install scripts above do this for you.

## Updating

Installed skills are versioned by a **content hash of the skill folder**, recorded in your
project's `skills-lock.json` by the `npx skills` installer — there is no semver or frontmatter
version field. To pull updates:

```bash
npx skills update     # aliases: check, upgrade
```

This re-hashes your installed skills against this repo and reports which ones changed. There is
no version number to pin or bump — a skill is "out of date" exactly when its folder content
differs from the published copy.

To see **what** changed (not just *that* something changed), read [`CHANGELOG.md`](CHANGELOG.md):
entries summarize public promotions and include the relevant source commit references.

## Provenance & versioning

Each promoted skill’s origin is documented in [`CHANGELOG.md`](CHANGELOG.md), with the source
commit included.
Provenance and change records live **only at the repo root** (`CHANGELOG.md`),
never inside `skills/<name>/` — putting them in a skill folder would change its content hash and
trigger a spurious "update" for every consumer.
