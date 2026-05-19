#!/usr/bin/env bash
# Interactively collect environment variables and write .env.local
set -euo pipefail

OUT=".env.local"
BOLD="\033[1m"
DIM="\033[2m"
RESET="\033[0m"
GREEN="\033[32m"

if [[ -f "$OUT" ]]; then
  echo -e "${BOLD}$OUT already exists.${RESET} Overwrite? (y/N) "
  read -r confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
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

# ── Firebase client (public) ──────────────────────────────────────────────────
echo -e "\n${GREEN}── Firebase client config (safe to expose) ──${RESET}"

NEXT_PUBLIC_FIREBASE_API_KEY=$(prompt "NEXT_PUBLIC_FIREBASE_API_KEY" "Firebase console → Project settings → Your apps" "")
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$(prompt "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" "e.g. yourproject.firebaseapp.com" "")
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$(prompt "NEXT_PUBLIC_FIREBASE_PROJECT_ID" "" "")
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$(prompt "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" "e.g. yourproject.firebasestorage.app" "")
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$(prompt "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" "" "")
NEXT_PUBLIC_FIREBASE_APP_ID=$(prompt "NEXT_PUBLIC_FIREBASE_APP_ID" "" "")

# ── Firebase Admin ────────────────────────────────────────────────────────────
echo -e "\n${GREEN}── Firebase Admin SDK (secret) ──${RESET}"

FIREBASE_SERVICE_ACCOUNT_JSON=$(prompt "FIREBASE_SERVICE_ACCOUNT_JSON" "Paste entire serviceAccountKey.json as one line" "")

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

# ── Write file ────────────────────────────────────────────────────────────────
cat > "$OUT" <<EOF
# Firebase client config (NEXT_PUBLIC_ = safe to expose in browser)
NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID

# Firebase Admin SDK — NEVER use NEXT_PUBLIC_ prefix
FIREBASE_SERVICE_ACCOUNT_JSON=$FIREBASE_SERVICE_ACCOUNT_JSON

# AeroAPI (FlightAware) — server-side only
AEROAPI_KEY=$AEROAPI_KEY

# Google Maps — server-side only (Geocoding + Distance Matrix)
GOOGLE_MAPS_KEY=$GOOGLE_MAPS_KEY

# Resend (email invites) — server-side only
RESEND_API_KEY=$RESEND_API_KEY
RESEND_FROM=$RESEND_FROM

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=$UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN=$UPSTASH_REDIS_REST_TOKEN

# Upstash QStash (cron trigger)
QSTASH_CURRENT_SIGNING_KEY=$QSTASH_CURRENT_SIGNING_KEY
QSTASH_NEXT_SIGNING_KEY=$QSTASH_NEXT_SIGNING_KEY

# App base URL (used in invite emails and Universal Links)
NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
EOF

echo -e "\n${BOLD}${GREEN}✓ Written to $OUT${RESET}"
echo "Next: run 'npm run dev' to verify, then import into Vercel."
