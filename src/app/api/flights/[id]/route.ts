import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, assertHost } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";

// DELETE /api/flights/[id] — guest removes themselves; if last passenger, removes flight too
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: flightId } = await params;

  const flightSnap = await adminDb.collection("flights").doc(flightId).get();
  if (!flightSnap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { tripId } = flightSnap.data()!;
  const passengerId = `${flightId}_${decoded.uid}`;
  const passengerRef = adminDb.collection("passengers").doc(passengerId);
  const passengerSnap = await passengerRef.get();

  // Only the passenger themselves or the host can remove a passenger
  const isHost = await assertHost(decoded.uid, tripId);
  if (!passengerSnap.exists && !isHost) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batch = adminDb.batch();

  if (passengerSnap.exists) {
    batch.delete(passengerRef);
  }

  // If this was the last passenger, delete the Flight doc too
  const remainingSnap = await adminDb
    .collection("passengers")
    .where("flightId", "==", flightId)
    .get();

  const remainingAfterDelete = remainingSnap.docs.filter(
    (d) => d.id !== passengerId
  );

  if (remainingAfterDelete.length === 0) {
    batch.delete(adminDb.collection("flights").doc(flightId));
  }

  await batch.commit();
  return NextResponse.json({ ok: true });
}
