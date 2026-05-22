import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, assertHost } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";
import { getTravelMinutes, buildDirectionsUrl, buildAirportDestination } from "@/lib/geocode";
import type { Flight, FlightStatus, FlightWithPassengers } from "@/types";

// GET /api/trips/[id]/traveltime — returns all flights with leaveBy + directions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId } = await params;

  if (!(await assertHost(decoded.uid, tripId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tripSnap = await adminDb.collection("trips").doc(tripId).get();
  if (!tripSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const trip = tripSnap.data()!;

  const url = new URL(req.url);
  const fromLat = parseFloat(url.searchParams.get("fromLat") ?? "");
  const fromLng = parseFloat(url.searchParams.get("fromLng") ?? "");
  const fromAddress = url.searchParams.get("fromAddress");

  const baseLatLng: { lat: number; lng: number } =
    !isNaN(fromLat) && !isNaN(fromLng) ? { lat: fromLat, lng: fromLng } : trip.baseLatLng;
  const baseAddress: string = fromAddress ?? trip.baseAddress;

  // Fetch all active flights for this trip
  const flightsSnap = await adminDb
    .collection("flights")
    .where("tripId", "==", tripId)
    .get();

  const flights = flightsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Flight));

  // Fetch all passengers for this trip
  const passengersSnap = await adminDb
    .collection("passengers")
    .where("tripId", "==", tripId)
    .get();

  const passengersByFlight = passengersSnap.docs.reduce<Record<string, object[]>>(
    (acc, d) => {
      const data = d.data() as { flightId: string };
      const p = { id: d.id, ...data };
      const fid = data.flightId;
      if (!acc[fid]) acc[fid] = [];
      acc[fid].push(p);
      return acc;
    },
    {}
  );

  // Compute travel time and leaveBy for each flight
  const DROP_OFF_BUFFER_DOMESTIC = 120; // minutes
  const DROP_OFF_BUFFER_INTERNATIONAL = 180;
  const PICKUP_BUFFER = 15;

  const results: FlightWithPassengers[] = await Promise.all(
    flights.map(async (flight) => {
      const rawTerminal =
        flight.direction === "arrival"
          ? flight.arrivalTerminal
          : flight.departureTerminal;

      // AeroAPI frequently returns stale historical terminal assignments for
      // scheduled future flights (e.g. a SFO flight showing JFK Terminal 7).
      // Only trust terminal data once the flight is actively operating and
      // AeroAPI is publishing real-time gate info.
      const LIVE_STATUSES: FlightStatus[] = ["departed", "en_route", "landed", "arrived"];
      const terminal = LIVE_STATUSES.includes(flight.status) ? rawTerminal : null;

      // Build destination string for distance matrix + directions link
      const destination = buildAirportDestination(trip.airport, terminal, flight.direction);

      const hasOriginOverride = !isNaN(fromLat) && !isNaN(fromLng);

      let travelMinutes: number | null = null;
      if (hasOriginOverride) {
        // Custom origin — compute live so it reflects the override location.
        // Pass approximate leave time for better traffic modeling.
        const relevantTimeMs =
          flight.direction === "arrival"
            ? new Date(flight.estimatedArrival ?? flight.scheduledArrival ?? "").getTime()
            : new Date(flight.estimatedDeparture ?? flight.scheduledDeparture ?? "").getTime();
        const bufferMs =
          flight.direction === "departure" ? 150 * 60_000 : 15 * 60_000;
        const approxLeaveBy = relevantTimeMs - bufferMs;
        const depTimeUnix =
          !isNaN(approxLeaveBy) && approxLeaveBy > Date.now()
            ? Math.floor(approxLeaveBy / 1000)
            : undefined;
        try {
          travelMinutes = await getTravelMinutes(baseLatLng, destination, depTimeUnix);
        } catch {
          // Non-fatal
        }
      } else {
        // No override — use the value the cron already cached on the flight doc.
        // Fall back to a live Maps call only if the cron hasn't populated it yet.
        travelMinutes = flight.travelMinutes ?? null;
        if (travelMinutes === null) {
          try {
            travelMinutes = await getTravelMinutes(baseLatLng, destination);
          } catch {
            // Non-fatal
          }
        }
      }

      // Determine the relevant flight time
      const relevantTime =
        flight.direction === "arrival"
          ? flight.estimatedArrival ?? flight.scheduledArrival
          : flight.estimatedDeparture ?? flight.scheduledDeparture;

      let leaveBy: string | null = null;
      if (relevantTime && travelMinutes !== null) {
        const flightTime = new Date(relevantTime).getTime();

        // Departure: need a 2-3h buffer before takeoff; Arrival: 15min after landing
        // Heuristic: if departure airport is same country code, domestic buffer
        const isDomestic =
          flight.direction === "departure"
            ? !flight.arrivalAirport || flight.arrivalAirport.startsWith(trip.airport[0])
            : true;

        const bufferMinutes =
          flight.direction === "departure"
            ? isDomestic
              ? DROP_OFF_BUFFER_DOMESTIC
              : DROP_OFF_BUFFER_INTERNATIONAL
            : PICKUP_BUFFER;

        const leaveByMs = flightTime - (travelMinutes + bufferMinutes) * 60_000;
        leaveBy = new Date(leaveByMs).toISOString();
      }

      const directionsUrl = buildDirectionsUrl(
        baseAddress,
        trip.airport,
        terminal,
        flight.direction
      );

      return {
        ...flight,
        passengers: (passengersByFlight[flight.id] ?? []) as FlightWithPassengers["passengers"],
        travelMinutes,
        leaveBy,
        directionsUrl,
      } as FlightWithPassengers & { directionsUrl: string };
    })
  );

  return NextResponse.json({ flights: results });
}
