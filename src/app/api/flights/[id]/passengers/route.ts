import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, assertHost, assertMembership } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";

// POST /api/flights/[id]/passengers — host adds an existing trip member to a flight
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: flightId } = await params;
  const { passengerUid } = await req.json();

  if (!passengerUid || typeof passengerUid !== "string") {
    return NextResponse.json({ error: "passengerUid required" }, { status: 400 });
  }

  const flightSnap = await adminDb.collection("flights").doc(flightId).get();
  if (!flightSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { tripId } = flightSnap.data()!;

  if (!(await assertHost(decoded.uid, tripId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await assertMembership(passengerUid, tripId))) {
    return NextResponse.json({ error: "User is not a member of this trip" }, { status: 403 });
  }

  const passengerId = `${flightId}_${passengerUid}`;
  const passengerRef = adminDb.collection("passengers").doc(passengerId);
  if ((await passengerRef.get()).exists) {
    return NextResponse.json({ error: "Already on this flight" }, { status: 409 });
  }

  const [userSnap, membershipSnap] = await Promise.all([
    adminDb.collection("users").doc(passengerUid).get(),
    adminDb.collection("memberships").doc(`${tripId}_${passengerUid}`).get(),
  ]);

  const displayName = userSnap.data()?.displayName ?? membershipSnap.data()?.displayName ?? "Guest";
  const photoURL = userSnap.data()?.photoURL ?? membershipSnap.data()?.photoURL ?? null;

  await passengerRef.set({ flightId, tripId, userUid: passengerUid, displayName, photoURL });

  return NextResponse.json({ ok: true, displayName, photoURL });
}
