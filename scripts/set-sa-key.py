#!/usr/bin/env python3
"""Usage: python3 scripts/set-sa-key.py ~/Downloads/serviceAccountKey.json"""

import json
import pathlib
import re
import sys

if len(sys.argv) < 2:
    print("Usage: python3 scripts/set-sa-key.py <path-to-serviceAccountKey.json>")
    sys.exit(1)

key_path = pathlib.Path(sys.argv[1]).expanduser().resolve()
if not key_path.exists():
    print(f"File not found: {key_path}")
    sys.exit(1)

val = json.dumps(json.loads(key_path.read_text()), separators=(",", ":"))
env_path = pathlib.Path(".env.local")
line = f"FIREBASE_SERVICE_ACCOUNT_JSON='{val}'"

pattern = re.compile(r"(?m)^FIREBASE_SERVICE_ACCOUNT_JSON=.*$")

if env_path.exists():
    txt = env_path.read_text()
    if pattern.search(txt):
        txt = pattern.sub(lambda _: line, txt)
    else:
        txt = txt.rstrip("\n") + f"\n{line}\n"
else:
    txt = f"{line}\n"

env_path.write_text(txt)
print("✓ FIREBASE_SERVICE_ACCOUNT_JSON updated in .env.local")
