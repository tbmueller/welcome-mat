import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, assertHost } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";
import { fetchFlightStatus } from "@/lib/aeroapi";
import { getTravelMinutes, buildAirportDestination } from "@/lib/geocode";
import { checkRateLimit } from "@/lib/ratelimit";
import type { Flight, FlightStatus } from "@/types";

const LIVE_STATUSES: FlightStatus[] = ["departed", "en_route", "landed", "arrived"];

// POST /api/trips/[id]/poll — force-refresh all flights for this trip from
// AeroAPI. Host-only. Called when the host clicks Refresh in At a Glance.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId } = await params;

  if (!(await assertHost(decoded.uid, tripId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate-limit manual polls: 5 per minute per user
  const limited = await checkRateLimit(req, {
    requests: 5,
    windowSeconds: 60,
    key: `poll:${decoded.uid}:${tripId}`,
  });
  if (limited) return limited;

  const tripSnap = await adminDb.collection("trips").doc(tripId).get();
  if (!tripSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const trip = tripSnap.data()!;

  const flightsSnap = await adminDb
    .collection("flights")
    .where("tripId", "==", tripId)
    .where("status", "not-in", ["arrived", "cancelled"])
    .get();

  let updated = 0;
  let errors = 0;

  await Promise.all(
    flightsSnap.docs.map(async (doc) => {
      const data = doc.data() as Flight;
      try {
        const freshData = await fetchFlightStatus(
          data.flightNumber,
          data.date,
          data.scheduledDeparture ?? null
        );
        if (!freshData) return;

        // Compute travelMinutes from the trip's base — same logic as the cron
        let travelMinutes: number | undefined;
        if (trip.baseLatLng) {
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
            trip.airport as string,
            terminal,
            data.direction
          );

          const relevantTime =
            data.direction === "arrival"
              ? (freshData.estimatedArrival ?? freshData.scheduledArrival ?? data.scheduledArrival)
              : (freshData.estimatedDeparture ?? freshData.scheduledDeparture ?? data.scheduledDeparture);
          const bufferMs = data.direction === "departure" ? 150 * 60_000 : 15 * 60_000;
          const approxLeaveBy = relevantTime
            ? new Date(relevantTime as string).getTime() - bufferMs
            : null;
          const depTimeUnix =
            approxLeaveBy && approxLeaveBy > Date.now()
              ? Math.floor(approxLeaveBy / 1000)
              : undefined;

          travelMinutes = await getTravelMinutes(
            trip.baseLatLng as { lat: number; lng: number },
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
    })
  );

  return NextResponse.json({ updated, errors });
}
