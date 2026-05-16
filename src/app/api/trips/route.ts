import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";
import { geocodeAddress } from "@/lib/geocode";
import { CreateTripSchema } from "@/lib/validation";
import { FieldValue } from "firebase-admin/firestore";

// GET /api/trips — list trips where caller is a member
export async function GET(req: NextRequest) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await adminDb
    .collection("memberships")
    .where("userUid", "==", decoded.uid)
    .get();

  const tripIds = memberships.docs.map((d) => d.data().tripId);
  if (tripIds.length === 0) return NextResponse.json({ trips: [] });

  // Firestore "in" supports up to 30 values
  const chunks: string[][] = [];
  for (let i = 0; i < tripIds.length; i += 30) {
    chunks.push(tripIds.slice(i, i + 30));
  }

  const trips = (
    await Promise.all(
      chunks.map((chunk) =>
        adminDb.collection("trips").where("__name__", "in", chunk).get()
      )
    )
  ).flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));

  return NextResponse.json({ trips });
}

// POST /api/trips — create a trip
export async function POST(req: NextRequest) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateTripSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, airport, baseAddress, saveAddress, saveAddressLabel, makeDefault } =
    parsed.data;

  const latLng = await geocodeAddress(baseAddress);

  const tripRef = adminDb.collection("trips").doc();
  const membershipId = `${tripRef.id}_${decoded.uid}`;
  const batch = adminDb.batch();

  batch.set(tripRef, {
    hostUid: decoded.uid,
    name,
    airport,
    baseAddress,
    baseLatLng: latLng,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Host membership — denormalize displayName so guests can be listed without
  // reading other users' documents
  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  const userData = userSnap.data();

  batch.set(adminDb.collection("memberships").doc(membershipId), {
    tripId: tripRef.id,
    userUid: decoded.uid,
    role: "host",
    displayName: userData?.displayName ?? "Host",
    photoURL: userData?.photoURL ?? null,
  });

  // Optionally persist the address to savedAddresses
  if (saveAddress && saveAddressLabel) {
    const addrRef = adminDb.collection("savedAddresses").doc();
    batch.set(addrRef, {
      userUid: decoded.uid,
      label: saveAddressLabel,
      address: baseAddress,
      latLng,
      isDefault: makeDefault ?? false,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (makeDefault) {
      const existingSnap = await adminDb
        .collection("savedAddresses")
        .where("userUid", "==", decoded.uid)
        .where("isDefault", "==", true)
        .get();
      existingSnap.docs.forEach((d) => batch.update(d.ref, { isDefault: false }));
      batch.update(adminDb.collection("users").doc(decoded.uid), {
        defaultAddressId: addrRef.id,
      });
    }
  }

  await batch.commit();
  return NextResponse.json({ id: tripRef.id });
}
