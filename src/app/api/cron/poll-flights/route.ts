import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { adminDb } from "@/lib/firebaseAdmin";
import { fetchFlightStatus } from "@/lib/aeroapi";
import { getTravelMinutes, buildAirportDestination } from "@/lib/geocode";
import type { FlightStatus } from "@/types";

const LOCK_DOC = "pollLock";
const LOCK_TTL_MS = 4 * 60 * 1000; // 4 minutes — cron fires every 5

// POST /api/cron/poll-flights — triggered by QStash every 5 minutes
export async function POST(req: NextRequest) {
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  });
  const body = await req.text();
  const isValid = await receiver
    .verify({
      signature: req.headers.get("upstash-signature") ?? "",
      body,
    })
    .catch(() => false);
  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Distributed lock to prevent overlapping runs
  const lockRef = adminDb.collection("_internal").doc(LOCK_DOC);
  const lock = await lockRef.get();
  if (lock.exists) {
    const lockedAt = lock.data()?.lockedAt?.toMillis?.() ?? 0;
    if (Date.now() - lockedAt < LOCK_TTL_MS) {
      return NextResponse.json({ skipped: "already running" });
    }
  }
  await lockRef.set({ lockedAt: new Date() });

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4h ago
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h ahead

    // Only poll flights in the active window; skip arrived/cancelled
    const snap = await adminDb
      .collection("flights")
      .where("status", "not-in", ["arrived", "cancelled"])
      .get();

    const toUpdate = snap.docs.filter((d) => {
      const data = d.data();
      // Always re-poll pending flights (AeroAPI had no data when they were added)
      if (data.status === "pending") return true;
      // Anchor the window to the *scheduled* time, not the estimated time.
      // Using estimated time causes flights to fall off the polling window once
      // AeroAPI pushes their estimate beyond +24h — exactly what happens when a
      // flight is progressively delayed. Scheduled time is immutable, so the
      // flight stays eligible regardless of how far the estimate drifts.
      // Fall back to estimated only when scheduled is null (e.g. AeroAPI hadn't
      // published a schedule yet when the flight was first added).
      const scheduledTime =
        data.direction === "arrival"
          ? (data.scheduledArrival ?? data.estimatedArrival)
          : (data.scheduledDeparture ?? data.estimatedDeparture);
      if (!scheduledTime) return false;
      const t = new Date(scheduledTime).getTime();
      return t >= windowStart.getTime() && t <= windowEnd.getTime();
    });

    // Batch-load trips so we can compute travel time per flight without N+1 reads
    const tripIds = [...new Set(toUpdate.map((d) => d.data().tripId as string))];
    const tripSnaps = await Promise.all(
      tripIds.map((id) => adminDb.collection("trips").doc(id).get())
    );
    const tripMap = Object.fromEntries(
      tripSnaps.filter((s) => s.exists).map((s) => [s.id, s.data()!])
    );

    const LIVE_STATUSES: FlightStatus[] = ["departed", "en_route", "landed", "arrived"];

    let updated = 0;
    let errors = 0;

    for (const doc of toUpdate) {
      const data = doc.data();
      try {
        // Pass the stored scheduledDeparture so fetchFlightStatus can pin to
        // the correct leg when a flight number operates multiple times per day.
        const freshData = await fetchFlightStatus(
          data.flightNumber,
          data.date,
          data.scheduledDeparture ?? null
        );
        if (!freshData) continue;

        // Compute travel time from the trip's base address.
        // Use the approximate leave time as departure_time so Maps models typical
        // traffic for that hour (e.g. 6 am rush vs 2 am quiet). Falls back to
        // live traffic if the leave time is already in the past.
        const tripData = tripMap[data.tripId as string];
        let travelMinutes: number | undefined;

        if (tripData?.baseLatLng) {
          const rawTerminal =
            data.direction === "arrival"
              ? freshData.arrivalTerminal
              : freshData.departureTerminal;
          const terminal = LIVE_STATUSES.includes(
            (freshData.status ?? data.status) as FlightStatus
          )
            ? rawTerminal
            : null;

          const destination = buildAirportDestination(
            tripData.airport as string,
            terminal,
            data.direction as "arrival" | "departure"
          );

          // Approximate leave time = flight time minus buffer
          const relevantTime =
            data.direction === "arrival"
              ? (freshData.estimatedArrival ?? freshData.scheduledArrival ?? data.scheduledArrival)
              : (freshData.estimatedDeparture ?? freshData.scheduledDeparture ?? data.scheduledDeparture);
          const bufferMs =
            data.direction === "departure" ? 150 * 60_000 : 15 * 60_000;
          const approxLeaveBy = relevantTime
            ? new Date(relevantTime as string).getTime() - bufferMs
            : null;
          const depTimeUnix =
            approxLeaveBy && approxLeaveBy > Date.now()
              ? Math.floor(approxLeaveBy / 1000)
              : undefined;

          travelMinutes = await getTravelMinutes(
            tripData.baseLatLng as { lat: number; lng: number },
            destination,
            depTimeUnix
          ).catch(() => undefined);
        }

        await doc.ref.update({
          ...freshData,
          ...(travelMinutes !== undefined ? { travelMinutes } : {}),
        });
        updated++;
      } catch {
        errors++;
      }
    }

    return NextResponse.json({ updated, errors, total: toUpdate.length });
  } finally {
    await lockRef.delete();
  }
}
