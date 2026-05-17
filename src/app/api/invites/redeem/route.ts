import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";
import { rateLimits } from "@/lib/ratelimit";

async function mergeManualGuest(
  tripId: string,
  realUid: string,
  realDisplayName: string,
  realPhotoURL: string | null,
) {
  const manualSnap = await adminDb
    .collection("memberships")
    .where("tripId", "==", tripId)
    .where("isManual", "==", true)
    .get();

  const match = manualSnap.docs.find(
    (doc) =>
      (doc.data().displayName as string)?.trim().toLowerCase() ===
      realDisplayName?.trim().toLowerCase(),
  );
  if (!match) return;

  const manualUid = match.data().userUid as string;
  const manualDisplayName = match.data().displayName as string;

  const [passengerSnap, tripSnap] = await Promise.all([
    adminDb.collection("passengers").where("tripId", "==", tripId).where("userUid", "==", manualUid).get(),
    adminDb.collection("trips").doc(tripId).get(),
  ]);

  const hostUid = tripSnap.data()?.hostUid as string;
  const tripName = tripSnap.data()?.name as string;

  const batch = adminDb.batch();

  for (const passengerDoc of passengerSnap.docs) {
    const data = passengerDoc.data();
    const newId = `${data.flightId}_${realUid}`;
    const newRef = adminDb.collection("passengers").doc(newId);
    const existing = await newRef.get();
    if (!existing.exists) {
      batch.set(newRef, { ...data, userUid: realUid, displayName: realDisplayName, photoURL: realPhotoURL });
    }
    batch.delete(passengerDoc.ref);
  }

  batch.delete(match.ref);

  batch.set(adminDb.collection("notifications").doc(), {
    type: "guest_merged",
    hostUid,
    tripId,
    tripName,
    manualDisplayName,
    realDisplayName,
    realPhotoURL,
    createdAt: new Date().toISOString(),
    read: false,
  });

  await batch.commit();
}

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

  let joinedDisplayName: string | null = null;
  let joinedPhotoURL: string | null = null;

  await adminDb.runTransaction(async (tx) => {
    const [freshInvite, existingMembership] = await Promise.all([
      tx.get(inviteRef),
      tx.get(adminDb.collection("memberships").doc(membershipId)),
    ]);

    const inv = freshInvite.data()!;

    // Already a member — don't consume an invite use, just let them through
    if (existingMembership.exists) return;

    // Already used this invite themselves (e.g. page reload)
    if ((inv.usedByUids as string[])?.includes(decoded.uid)) return;

    // Enforce max uses
    if ((inv.useCount ?? 0) >= (inv.maxUses ?? 1)) {
      throw new Error("Invite link is full");
    }

    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    const userData = userSnap.data();
    joinedDisplayName = userData?.displayName ?? decoded.name ?? "Guest";
    joinedPhotoURL = userData?.photoURL ?? decoded.picture ?? null;

    tx.set(adminDb.collection("memberships").doc(membershipId), {
      tripId,
      userUid: decoded.uid,
      role: "guest",
      displayName: joinedDisplayName,
      photoURL: joinedPhotoURL,
    });

    tx.update(inviteRef, {
      useCount: (inv.useCount ?? 0) + 1,
      usedByUids: [...((inv.usedByUids as string[]) ?? []), decoded.uid],
    });
  });

  // If a new membership was created, check for a matching manual guest to merge
  if (joinedDisplayName) {
    await mergeManualGuest(tripId, decoded.uid, joinedDisplayName, joinedPhotoURL);
  }

  return NextResponse.json({ tripId });
}
