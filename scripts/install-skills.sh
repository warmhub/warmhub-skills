#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Install WarmHub skills into Claude Code or Codex.

Usage:
  ./scripts/install-skills.sh --project /path/to/repo [options]
  ./scripts/install-skills.sh --claude-personal [options]
  ./scripts/install-skills.sh --codex-personal [options]
  ./scripts/install-skills.sh --codex-home /path/to/.codex [options]
  ./scripts/install-skills.sh --target /path/to/skills [options]

Options:
  --project PATH         Install into PATH/.claude/skills
  --personal             Alias for --claude-personal
  --claude-personal      Install into ~/.claude/skills
  --codex-personal       Install into ${CODEX_HOME:-~/.codex}/skills
  --codex-home PATH      Install into PATH/skills
  --target PATH          Install into an explicit skills directory
  --skill NAME           Install a single skill (repeatable)
  --mode MODE            symlink (default) or copy
  --force                Replace an existing installed skill
  --list                 Print available skill names and exit
  -h, --help             Show this help text
EOF
}

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
skills_root="$repo_root/skills"
mode="symlink"
target=""
manager=""
codex_home_default="${CODEX_HOME:-$HOME/.codex}"
force=0
declare -a selected_skills=()

die() {
  echo "error: $*" >&2
  exit 1
}

list_skills() {
  find "$skills_root" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      [[ $# -ge 2 ]] || die "--project requires a path"
      target="$2/.claude/skills"
      manager="claude"
      shift 2
      ;;
    --personal|--claude-personal)
      target="$HOME/.claude/skills"
      manager="claude"
      shift
      ;;
    --codex-personal)
      target="$codex_home_default/skills"
      manager="codex"
      shift
      ;;
    --codex-home)
      [[ $# -ge 2 ]] || die "--codex-home requires a path"
      target="$2/skills"
      manager="codex"
      shift 2
      ;;
    --target)
      [[ $# -ge 2 ]] || die "--target requires a path"
      target="$2"
      shift 2
      ;;
    --skill)
      [[ $# -ge 2 ]] || die "--skill requires a name"
      selected_skills+=("$2")
      shift 2
      ;;
    --mode)
      [[ $# -ge 2 ]] || die "--mode requires symlink or copy"
      mode="$2"
      shift 2
      ;;
    --force)
      force=1
      shift
      ;;
    --list)
      list_skills
      exit 0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

[[ -n "$target" ]] || {
  usage >&2
  exit 1
}

case "$mode" in
  symlink|copy) ;;
  *) die "--mode must be symlink or copy" ;;
esac

mkdir -p "$target"

if [[ ${#selected_skills[@]} -eq 0 ]]; then
  while IFS= read -r skill_name; do
    selected_skills+=("$skill_name")
  done < <(list_skills)
fi

[[ ${#selected_skills[@]} -gt 0 ]] || die "no skills found in $skills_root"

for skill_name in "${selected_skills[@]}"; do
  src="$skills_root/$skill_name"
  dest="$target/$skill_name"

  [[ -d "$src" ]] || die "skill not found: $skill_name"
  [[ -f "$src/SKILL.md" ]] || die "missing SKILL.md for $skill_name"

  if [[ -e "$dest" || -L "$dest" ]]; then
    if [[ $force -ne 1 ]]; then
      die "destination exists: $dest (rerun with --force to replace)"
    fi
    rm -rf "$dest"
  fi

  if [[ "$mode" == "symlink" ]]; then
    ln -s "$src" "$dest"
  else
    cp -R "$src" "$dest"
  fi

  echo "installed $skill_name -> $dest"
done

if [[ "$manager" == "codex" ]]; then
  echo "restart Codex to pick up new skills"
fi
