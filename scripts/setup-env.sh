#!/usr/bin/env bash
# Interactively collect environment variables and write .env.local
set -euo pipefail

OUT=".env.local"
BOLD="\033[1m"
DIM="\033[2m"
RESET="\033[0m"
GREEN="\033[32m"

if [[ -f "$OUT" ]]; then
  echo -e "${BOLD}$OUT already exists — existing values will be updated in place.${RESET}"
fi

prompt() {
  local key="$1"
  local hint="$2"
  local default="$3"

  echo ""
  echo -e "${BOLD}$key${RESET}"
  [[ -n "$hint" ]] && echo -e "${DIM}  $hint${RESET}"
  if [[ -n "$default" ]]; then
    echo -e "${DIM}  Leave blank to use: $default${RESET}"
  fi
  printf "  > "

  local val
  read -r val
  if [[ -z "$val" && -n "$default" ]]; then
    val="$default"
  fi
  echo "$val"
}

echo -e "\n${BOLD}Welcome-Mat environment setup${RESET}"
echo "Values are written to $OUT — never commit this file."

# ── AeroAPI ───────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}── AeroAPI ──${RESET}"

AEROAPI_KEY=$(prompt "AEROAPI_KEY" "flightaware.com/aeroapi → API credentials" "")

# ── Google Maps ───────────────────────────────────────────────────────────────
echo -e "\n${GREEN}── Google Maps ──${RESET}"

GOOGLE_MAPS_KEY=$(prompt "GOOGLE_MAPS_KEY" "Google Cloud Console → APIs & Services → Credentials" "")

# ── Resend ────────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}── Resend (email) ──${RESET}"

RESEND_API_KEY=$(prompt "RESEND_API_KEY" "resend.com → API Keys" "")
RESEND_FROM=$(prompt "RESEND_FROM" "Must match a verified Resend sender domain" "noreply@yourdomain.com")

# ── Upstash ───────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}── Upstash Redis ──${RESET}"

UPSTASH_REDIS_REST_URL=$(prompt "UPSTASH_REDIS_REST_URL" "Upstash console → your Redis database" "")
UPSTASH_REDIS_REST_TOKEN=$(prompt "UPSTASH_REDIS_REST_TOKEN" "" "")

echo -e "\n${GREEN}── Upstash QStash ──${RESET}"

QSTASH_CURRENT_SIGNING_KEY=$(prompt "QSTASH_CURRENT_SIGNING_KEY" "Upstash console → QStash → Signing Keys" "")
QSTASH_NEXT_SIGNING_KEY=$(prompt "QSTASH_NEXT_SIGNING_KEY" "Same page" "")

# ── App URL ───────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}── App URL ──${RESET}"

NEXT_PUBLIC_APP_URL=$(prompt "NEXT_PUBLIC_APP_URL" "Use production URL after first Vercel deploy" "http://localhost:3000")

# ── Upsert into .env.local (preserves existing keys not listed here) ──────────
export AEROAPI_KEY GOOGLE_MAPS_KEY RESEND_API_KEY RESEND_FROM \
       UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN \
       QSTASH_CURRENT_SIGNING_KEY QSTASH_NEXT_SIGNING_KEY NEXT_PUBLIC_APP_URL
python3 - <<'PYEOF'
import os, pathlib, re

pairs = [
    ("AEROAPI_KEY",                os.environ["AEROAPI_KEY"]),
    ("GOOGLE_MAPS_KEY",            os.environ["GOOGLE_MAPS_KEY"]),
    ("RESEND_API_KEY",             os.environ["RESEND_API_KEY"]),
    ("RESEND_FROM",                os.environ["RESEND_FROM"]),
    ("UPSTASH_REDIS_REST_URL",     os.environ["UPSTASH_REDIS_REST_URL"]),
    ("UPSTASH_REDIS_REST_TOKEN",   os.environ["UPSTASH_REDIS_REST_TOKEN"]),
    ("QSTASH_CURRENT_SIGNING_KEY", os.environ["QSTASH_CURRENT_SIGNING_KEY"]),
    ("QSTASH_NEXT_SIGNING_KEY",    os.environ["QSTASH_NEXT_SIGNING_KEY"]),
    ("NEXT_PUBLIC_APP_URL",        os.environ["NEXT_PUBLIC_APP_URL"]),
]

p = pathlib.Path(".env.local")
txt = p.read_text() if p.exists() else ""

for key, val in pairs:
    line = f"{key}={val}"
    pattern = re.compile(rf"(?m)^{re.escape(key)}=.*$")
    if pattern.search(txt):
        txt = pattern.sub(lambda _: line, txt)
    else:
        txt = txt.rstrip("\n") + f"\n{line}\n"

p.write_text(txt)
PYEOF

echo -e "\n${BOLD}${GREEN}✓ Updated $OUT${RESET}"
echo "Firebase keys are preserved. To set the service account run:"
echo "  python3 scripts/set-sa-key.py <path-to-serviceAccountKey.json>"
echo "Then run 'npm run dev' to verify, and import into Vercel."
