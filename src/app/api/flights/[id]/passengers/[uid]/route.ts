import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, assertHost } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";

// DELETE /api/flights/[id]/passengers/[uid] — host removes a specific passenger from a flight
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; uid: string }> }
) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: flightId, uid: passengerUid } = await params;

  const flightSnap = await adminDb.collection("flights").doc(flightId).get();
  if (!flightSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { tripId } = flightSnap.data()!;

  // Allow host to remove anyone; allow a passenger to remove themselves
  const isSelf = decoded.uid === passengerUid;
  if (!isSelf && !(await assertHost(decoded.uid, tripId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const passengerId = `${flightId}_${passengerUid}`;
  const passengerRef = adminDb.collection("passengers").doc(passengerId);

  const batch = adminDb.batch();
  batch.delete(passengerRef);

  // Delete the flight doc if this was the last passenger
  const remainingSnap = await adminDb.collection("passengers").where("flightId", "==", flightId).get();
  const remainingAfterDelete = remainingSnap.docs.filter((d) => d.id !== passengerId);
  if (remainingAfterDelete.length === 0) {
    batch.delete(adminDb.collection("flights").doc(flightId));
  }

  await batch.commit();
  return NextResponse.json({ ok: true });
}
