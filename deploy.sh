#!/bin/bash
# Deploy dandandog Pages project. Usage: bash deploy.sh [project-name]
# Gets the Cloudflare API surrogate from the local credential store
# (never the real key) and hands it to wrangler.
set -e
cd "$(dirname "$0")"
PROJECT="${1:-dandandog}"
export CLOUDFLARE_ACCOUNT_ID=3c76b79d615b6bc886fe564307682767
export CLOUDFLARE_API_TOKEN=$(python3 -c "import sys; sys.path.insert(0,'/opt/muse/skills/custom-connector-setup/bin'); from dynamic_credentials import dynamic_credential_entry; print(dynamic_credential_entry('custom.cloudflare')['surrogate'])")
npx -y wrangler@4 pages deploy public --project-name="$PROJECT" --commit-dirty=true
