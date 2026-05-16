import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, assertMembership } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";
import { fetchFlightStatus } from "@/lib/aeroapi";
import { AddFlightSchema } from "@/lib/validation";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimits } from "@/lib/ratelimit";

// POST /api/flights — guest adds a flight (arrival or departure)
export async function POST(req: NextRequest) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimits.flightAdd(req, decoded.uid);
  if (limited) return limited;

  const body = await req.json();
  const parsed = AddFlightSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { flightNumber, date, direction, tripId } = parsed.data;

  if (!(await assertMembership(decoded.uid, tripId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if a Flight doc already exists for this flight in this trip
  const existingSnap = await adminDb
    .collection("flights")
    .where("tripId", "==", tripId)
    .where("flightNumber", "==", flightNumber)
    .where("date", "==", date)
    .where("direction", "==", direction)
    .limit(1)
    .get();

  let flightId: string;

  if (!existingSnap.empty) {
    // Reuse the existing Flight doc — just add this user as a Passenger
    flightId = existingSnap.docs[0].id;
  } else {
    // Fetch live data from AeroAPI and create a new Flight doc
    const flightData = await fetchFlightStatus(flightNumber, date);

    const flightRef = adminDb.collection("flights").doc();
    flightId = flightRef.id;

    await flightRef.set({
      tripId,
      flightNumber,
      date,
      direction,
      airline: flightData.airline ?? "",
      scheduledDeparture: flightData.scheduledDeparture ?? null,
      estimatedDeparture: flightData.estimatedDeparture ?? null,
      departureAirport: flightData.departureAirport ?? null,
      departureTerminal: flightData.departureTerminal ?? null,
      departureGate: flightData.departureGate ?? null,
      scheduledArrival: flightData.scheduledArrival ?? null,
      estimatedArrival: flightData.estimatedArrival ?? null,
      arrivalAirport: flightData.arrivalAirport ?? null,
      arrivalTerminal: flightData.arrivalTerminal ?? null,
      arrivalGate: flightData.arrivalGate ?? null,
      status: flightData.status ?? "unknown",
      lastPolled: flightData.lastPolled ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // Create Passenger record (idempotent — use composite ID)
  const passengerId = `${flightId}_${decoded.uid}`;
  const passengerRef = adminDb.collection("passengers").doc(passengerId);
  const passengerSnap = await passengerRef.get();

  if (!passengerSnap.exists) {
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    const userData = userSnap.data();
    await passengerRef.set({
      flightId,
      tripId,
      userUid: decoded.uid,
      displayName: userData?.displayName ?? "Guest",
      photoURL: userData?.photoURL ?? null,
    });
  }

  return NextResponse.json({ flightId });
}
