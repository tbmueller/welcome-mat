import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";
import { geocodeAddress } from "@/lib/geocode";
import { SavedAddressSchema } from "@/lib/validation";
import { FieldValue } from "firebase-admin/firestore";

// GET /api/addresses — list caller's saved addresses
export async function GET(req: NextRequest) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb
    .collection("savedAddresses")
    .where("userUid", "==", decoded.uid)
    .orderBy("createdAt", "desc")
    .get();

  const addresses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ addresses });
}

// POST /api/addresses — create a saved address
export async function POST(req: NextRequest) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = SavedAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { label, address } = parsed.data;
  const latLng = await geocodeAddress(address);

  const makeDefault = body.makeDefault === true;

  const ref = adminDb.collection("savedAddresses").doc();
  const batch = adminDb.batch();

  batch.set(ref, {
    userUid: decoded.uid,
    label,
    address,
    latLng,
    isDefault: makeDefault,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (makeDefault) {
    // Clear isDefault on any existing default
    const existingSnap = await adminDb
      .collection("savedAddresses")
      .where("userUid", "==", decoded.uid)
      .where("isDefault", "==", true)
      .get();
    existingSnap.docs.forEach((d) => batch.update(d.ref, { isDefault: false }));

    // Update user defaultAddressId
    batch.set(adminDb.collection("users").doc(decoded.uid), {
      defaultAddressId: ref.id,
    }, { merge: true });
  }

  await batch.commit();
  return NextResponse.json({ id: ref.id });
}
