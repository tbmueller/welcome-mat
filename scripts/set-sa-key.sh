#!/usr/bin/env bash
# Usage: bash scripts/set-sa-key.sh ~/Downloads/serviceAccountKey.json
set -euo pipefail

if [[ -z "${1:-}" ]]; then
  echo "Usage: bash scripts/set-sa-key.sh <path-to-serviceAccountKey.json>"
  exit 1
fi

path="${1/#\~/$HOME}"

if [[ ! -f "$path" ]]; then
  echo "File not found: $path"
  exit 1
fi

python3 - "$path" <<'PYEOF'
import json, pathlib, re, sys

val = json.dumps(json.load(open(sys.argv[1])))
p = pathlib.Path(".env.local")
line = f"FIREBASE_SERVICE_ACCOUNT_JSON='{val}'"

if p.exists():
    txt = p.read_text()
    if re.search(r"(?m)^FIREBASE_SERVICE_ACCOUNT_JSON=", txt):
        txt = re.sub(r"(?m)^FIREBASE_SERVICE_ACCOUNT_JSON=.*$", line, txt)
    else:
        txt += f"\n{line}\n"
else:
    txt = f"{line}\n"

p.write_text(txt)
print("✓ FIREBASE_SERVICE_ACCOUNT_JSON updated in .env.local")
PYEOF
