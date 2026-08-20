#!/usr/bin/env bash
# Setup a new WarmHub repo with standard configuration.
#
# Usage: ./setup-repo.sh <org> <repo> [description]
#
# Prerequisites:
#   - Node 22+
#   - wh CLI installed (npm install -g @warmhub/cli)
#   - wh CLI authenticated (wh auth login)
#   - WH_TOKEN PAT exported for generated SDK code

set -euo pipefail

ORG="${1:?Usage: setup-repo.sh <org> <repo> [description]}"
REPO="${2:?Usage: setup-repo.sh <org> <repo> [description]}"
DESC="${3:-Data ingestion repo}"

echo "Creating WarmHub repo: ${ORG}/${REPO}"
if ! output=$(wh repo create "${ORG}/${REPO}" -d "${DESC}" --visibility private 2>&1); then
  if echo "$output" | grep -qi "already exists"; then
    echo "Repo already exists, continuing"
  else
    echo "Error creating repo: $output" >&2
    exit 1
  fi
fi

echo ""
echo "Setting up project..."

# Initialize if no package.json
if [ ! -f package.json ]; then
  bun init -y
fi

# Install SDK
bun add @warmhub/sdk-ts

echo ""
echo "Done. Next steps:"
echo "  1. Define shapes in src/shapes.ts"
echo "  2. Implement parser, operations, auth, dedup, qc"
echo "  3. Run: bun run src/cli.ts setup"
echo "  4. Run: bun run src/cli.ts ingest --latest"
