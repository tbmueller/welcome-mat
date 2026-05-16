@AGENTS.md

# Trip Attendee Tracker

Next.js 15 (App Router) + Firebase + Capacitor. Tracks guests' inbound/outbound flights and tells the host when to leave.

## Commands

```bash
npm run dev        # local dev server
npm run build      # production build (also runs type check)
npx tsc --noEmit   # type check only
```

## Architecture

| Layer | Technology |
|---|---|
| Web | Next.js App Router, Tailwind CSS |
| Native wrapper | Capacitor (iOS + Android) |
| Auth | Firebase Auth — Google OAuth only |
| Database | Firestore (client real-time listeners + Admin SDK on server) |
| Flight data | AeroAPI (FlightAware) — server-side only |
| Travel time | Google Maps Distance Matrix — server-side only |
| Email | Resend |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) |
| Deploy | Vercel (cron via `vercel.json`) |

## Key data model rules

- **Membership IDs** are `{tripId}_{uid}` — composite key avoids `list()` calls in Firestore security rule helpers
- **Passenger IDs** are `{flightId}_{uid}` — same reason
- **Flight docs are shared** across passengers on the same flight. `Passenger` is the join table. When a guest adds a flight number that already exists in the trip, they get a new `Passenger` doc pointing to the existing `Flight` doc — no duplicate AeroAPI calls.
- **Base location is per-trip**, not per-user. `Trip.baseAddress` / `Trip.baseLatLng` — supports home, Airbnb, hotel, etc.
- **SavedAddress** is a per-user collection. `User.defaultAddressId` points to the current default. Deleting the default clears `defaultAddressId` in a Firestore transaction.

## API route conventions

Every API route must:
1. Call `verifyIdToken(req)` first — returns `null` on failure → 401
2. Call `assertMembership(uid, tripId)` or `assertHost(uid, tripId)` before Firestore reads (Admin SDK bypasses rules)
3. Validate the request body with a Zod schema from `src/lib/validation.ts`
4. Apply a rate limit from `src/lib/ratelimit.ts`

## Environment variables

See `.env.local.example`. Never use `NEXT_PUBLIC_` prefix for AeroAPI, Google Maps, or Firebase service account. The Firebase client config (`NEXT_PUBLIC_FIREBASE_*`) is intentionally public — security is enforced by Firestore rules and Auth.

## Firestore security rules

Rules live in `firestore.rules`. Deploy with `firebase deploy --only firestore:rules`.

The catch-all denies everything not explicitly allowed. The `_internal` collection (cron lock) is Admin SDK only and bypasses rules.

## Cron

`/api/cron/poll-flights` runs every 5 min via Vercel Cron. Protected by `Authorization: Bearer CRON_SECRET`. Uses a Firestore lock (`_internal/pollLock`, TTL 4 min) to prevent overlapping runs. Only polls flights with estimated time in the next 24h and status not `arrived`/`cancelled`.

## Capacitor

`npx cap add ios` / `npx cap add android` to initialize native projects (gitignored). Build first: `npm run build`. For dev, set `server.url` in `capacitor.config.ts` to your local dev server URL. Use Universal Links (not custom URL schemes) for invite deep links.
