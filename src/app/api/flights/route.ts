import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, assertMembership, assertHost } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";
import { fetchFlightStatus } from "@/lib/aeroapi";
import { AddFlightSchema } from "@/lib/validation";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimits } from "@/lib/ratelimit";

// POST /api/flights — add a flight; host may specify passengerUid to add for a member
export async function POST(req: NextRequest) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimits.flightAdd(req, decoded.uid);
  if (limited) return limited;

  const body = await req.json();
  const parsed = AddFlightSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    const first = Object.values(fields).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid request" }, { status: 400 });
  }

  const { flightNumber, date, direction, tripId, passengerUid: requestedUid } = parsed.data;

  // Determine whose flight this is
  const passengerUid = requestedUid ?? decoded.uid;
  const addingForOther = passengerUid !== decoded.uid;

  if (addingForOther) {
    // Only hosts may add flights for other members
    if (!(await assertHost(decoded.uid, tripId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!(await assertMembership(passengerUid, tripId))) {
      return NextResponse.json({ error: "Passenger is not a member of this trip" }, { status: 403 });
    }
  } else {
    if (!(await assertMembership(decoded.uid, tripId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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
    flightId = existingSnap.docs[0].id;
  } else {
    let flightData: Partial<import("@/types").Flight> | null;
    try {
      flightData = await fetchFlightStatus(flightNumber, date);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to look up flight";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const flightRef = adminDb.collection("flights").doc();
    flightId = flightRef.id;

    await flightRef.set({
      tripId,
      flightNumber,
      date,
      direction,
      airline: flightData?.airline ?? "",
      scheduledDeparture: flightData?.scheduledDeparture ?? null,
      estimatedDeparture: flightData?.estimatedDeparture ?? null,
      departureAirport: flightData?.departureAirport ?? null,
      departureTerminal: flightData?.departureTerminal ?? null,
      departureGate: flightData?.departureGate ?? null,
      scheduledArrival: flightData?.scheduledArrival ?? null,
      estimatedArrival: flightData?.estimatedArrival ?? null,
      arrivalAirport: flightData?.arrivalAirport ?? null,
      arrivalTerminal: flightData?.arrivalTerminal ?? null,
      arrivalGate: flightData?.arrivalGate ?? null,
      status: flightData?.status ?? "pending",
      lastPolled: flightData?.lastPolled ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // Create Passenger record (idempotent — composite ID)
  const passengerId = `${flightId}_${passengerUid}`;
  const passengerRef = adminDb.collection("passengers").doc(passengerId);
  const passengerSnap = await passengerRef.get();

  if (!passengerSnap.exists) {
    // Get display info: try user doc first, fall back to membership
    const [userSnap, membershipSnap] = await Promise.all([
      adminDb.collection("users").doc(passengerUid).get(),
      adminDb.collection("memberships").doc(`${tripId}_${passengerUid}`).get(),
    ]);
    const displayName =
      userSnap.data()?.displayName ??
      membershipSnap.data()?.displayName ??
      "Guest";
    const photoURL =
      userSnap.data()?.photoURL ??
      membershipSnap.data()?.photoURL ??
      null;

    await passengerRef.set({
      flightId,
      tripId,
      userUid: passengerUid,
      displayName,
      photoURL,
    });
  }

  return NextResponse.json({ flightId });
}
