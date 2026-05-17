# Deployment Checklist

## 1 — Push to GitHub

1. Go to github.com/new → create a **private** repo (no README, no .gitignore)
2. Add the remote and push:
   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

---

## 2 — Connect to Vercel

1. vercel.com/new → import the GitHub repo
2. Framework preset: **Next.js** (auto-detected)
3. Leave root directory as `/`
4. Do **not** deploy yet — set env vars first (step 3)

---

## 3 — Environment variables

Add each of these in Vercel → Project → Settings → Environment Variables.
All should be scoped to **Production** (and Preview if you want preview deploys to work).

| Variable | Where to get it | Notes |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase console → Project settings → Your apps | Safe to expose |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same | e.g. `yourproject.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same | |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase console → Project settings → Service accounts → Generate new private key → paste entire JSON as one line | **Secret** — never commit |
| `AEROAPI_KEY` | flightaware.com/aeroapi | **Secret** |
| `GOOGLE_MAPS_KEY` | Google Cloud Console → APIs & Services → Credentials | **Secret** — restrict to your Vercel domain in production (see step 6) |
| `RESEND_API_KEY` | resend.com → API Keys | **Secret** |
| `RESEND_FROM` | e.g. `noreply@yourdomain.com` | Must match a verified Resend sender domain |
| `UPSTASH_REDIS_REST_URL` | Upstash console → your database | **Secret** |
| `UPSTASH_REDIS_REST_TOKEN` | Same | **Secret** |
| `CRON_SECRET` | Generate: `openssl rand -base64 32` | **Secret** — used to authenticate Vercel Cron calls |
| `NEXT_PUBLIC_APP_URL` | Your Vercel production URL | e.g. `https://your-app.vercel.app` — update after first deploy |

---

## 4 — Deploy Firestore security rules

```bash
firebase deploy --only firestore:rules
```

Run this from the project root whenever `firestore.rules` changes.

---

## 5 — Add production domain to Firebase Auth

Firebase console → Authentication → Settings → Authorized domains → Add domain

Add your Vercel production URL (e.g. `your-app.vercel.app`).
Without this, Google Sign-In will be blocked on production.

---

## 6 — Restrict the Google Maps API key

Google Cloud Console → APIs & Services → Credentials → select your key:

- **Application restrictions** → HTTP referrers → add:
  - `https://your-app.vercel.app/*`
  - `http://localhost:3000/*` (for local dev — or use a separate dev key)
- **API restrictions** → Restrict key → select:
  - Geocoding API
  - Distance Matrix API
  - Places API (if used for address autocomplete)

---

## 7 — Update `NEXT_PUBLIC_APP_URL`

After the first successful deploy, copy the production URL from Vercel and update the env var in Vercel settings. Redeploy (or it will pick up on the next push).

This URL is embedded in invite email links and Capacitor Universal Links.

---

## 8 — Smoke test

- [ ] Sign in with Google
- [ ] Create a trip
- [ ] Copy invite link → open in incognito → join as a new user
- [ ] Add a flight to the trip
- [ ] Check that the cron endpoint returns 200 when called with `Authorization: Bearer <CRON_SECRET>`
- [ ] Verify a merge notification appears when joining with a matching manual guest name
- [ ] Check Vercel Functions logs for any runtime errors

---

## Ongoing

- Redeploy Firestore rules after any change to `firestore.rules`
- Rotate `CRON_SECRET` in both Vercel and `vercel.json` if ever exposed
- Monitor AeroAPI usage — free tier has a monthly call limit
