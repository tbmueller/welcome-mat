import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";
import { rateLimits } from "@/lib/ratelimit";

// POST /api/invites/redeem — consume an invite token and create a Membership
export async function POST(req: NextRequest) {
  // Rate-limit by IP before auth (token enumeration defense)
  const limited = await rateLimits.preAuth(req);
  if (limited) return limited;

  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token || typeof token !== "string" || token.length !== 64) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const inviteSnap = await adminDb
    .collection("invites")
    .where("token", "==", token)
    .limit(1)
    .get();

  if (inviteSnap.empty) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const inviteRef = inviteSnap.docs[0].ref;
  const invite = inviteSnap.docs[0].data();

  if (!invite.active) {
    return NextResponse.json({ error: "Invite has been revoked" }, { status: 410 });
  }
  if (invite.usedByUid !== null) {
    return NextResponse.json({ error: "Invite already used" }, { status: 409 });
  }
  if (new Date(invite.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  // If email-targeted, verify the authenticated user's email matches
  if (invite.email && invite.email !== decoded.email) {
    return NextResponse.json(
      { error: "This invite was sent to a different email address" },
      { status: 403 }
    );
  }

  const { tripId } = invite;
  const membershipId = `${tripId}_${decoded.uid}`;

  // Use a transaction to atomically mark the invite used and create membership
  await adminDb.runTransaction(async (tx) => {
    const freshInvite = await tx.get(inviteRef);
    if (freshInvite.data()?.usedByUid !== null) {
      throw new Error("Invite already used");
    }

    const existingMembership = await tx.get(
      adminDb.collection("memberships").doc(membershipId)
    );

    tx.update(inviteRef, { usedByUid: decoded.uid });

    if (!existingMembership.exists) {
      const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
      const userData = userSnap.data();
      tx.set(adminDb.collection("memberships").doc(membershipId), {
        tripId,
        userUid: decoded.uid,
        role: "guest",
        displayName: userData?.displayName ?? decoded.name ?? "Guest",
        photoURL: userData?.photoURL ?? decoded.picture ?? null,
      });
    }
  });

  return NextResponse.json({ tripId });
}
