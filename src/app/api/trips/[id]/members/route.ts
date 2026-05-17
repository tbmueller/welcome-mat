import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, assertMembership, assertHost } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";
import { AddManualGuestSchema } from "@/lib/validation";
import crypto from "crypto";

// GET /api/trips/[id]/members — list memberships (displayName + photoURL only, no emails)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId } = await params;

  if (!(await assertMembership(decoded.uid, tripId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snap = await adminDb
    .collection("memberships")
    .where("tripId", "==", tripId)
    .get();

  // Return only non-sensitive fields — no emails leave the server
  const members = snap.docs.map((d) => {
    const data = d.data();
    return {
      userUid: data.userUid,
      role: data.role,
      displayName: data.displayName,
      photoURL: data.photoURL,
    };
  });

  return NextResponse.json({ members });
}

// POST /api/trips/[id]/members — host adds a manual (offline) guest by name
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

  const body = await req.json();
  const parsed = AddManualGuestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userUid = `manual_${crypto.randomBytes(12).toString("hex")}`;
  const membershipId = `${tripId}_${userUid}`;

  await adminDb.collection("memberships").doc(membershipId).set({
    tripId,
    userUid,
    role: "guest",
    displayName: parsed.data.displayName,
    photoURL: null,
    isManual: true,
  });

  return NextResponse.json({ userUid, displayName: parsed.data.displayName });
}

// DELETE /api/trips/[id]/members — host removes a guest from a trip
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId } = await params;
  const { userUid } = await req.json();

  if (!userUid || typeof userUid !== "string") {
    return NextResponse.json({ error: "userUid required" }, { status: 400 });
  }

  // Only the host can remove someone else; a guest can remove themselves
  const callerMembershipId = `${tripId}_${decoded.uid}`;
  const callerSnap = await adminDb.collection("memberships").doc(callerMembershipId).get();
  const callerRole = callerSnap.data()?.role;

  if (!callerSnap.exists) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (decoded.uid !== userUid && callerRole !== "host") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cannot remove the host
  const targetMembershipId = `${tripId}_${userUid}`;
  const targetSnap = await adminDb.collection("memberships").doc(targetMembershipId).get();
  if (targetSnap.data()?.role === "host") {
    return NextResponse.json({ error: "Cannot remove the host" }, { status: 400 });
  }

  const batch = adminDb.batch();
  batch.delete(adminDb.collection("memberships").doc(targetMembershipId));

  // Also remove all their Passenger records for this trip
  const passengerSnap = await adminDb
    .collection("passengers")
    .where("tripId", "==", tripId)
    .where("userUid", "==", userUid)
    .get();
  passengerSnap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();
  return NextResponse.json({ ok: true });
}
