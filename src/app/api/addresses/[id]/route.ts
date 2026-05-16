import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";
import { geocodeAddress } from "@/lib/geocode";
import { SavedAddressSchema } from "@/lib/validation";

// PATCH /api/addresses/[id] — update label, address, or default status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ref = adminDb.collection("savedAddresses").doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userUid !== decoded.uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = SavedAddressSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.label) updates.label = parsed.data.label;
  if (parsed.data.address) {
    updates.address = parsed.data.address;
    updates.latLng = await geocodeAddress(parsed.data.address);
  }

  const batch = adminDb.batch();
  batch.update(ref, updates);

  if (body.makeDefault === true) {
    // Clear old default
    const existingSnap = await adminDb
      .collection("savedAddresses")
      .where("userUid", "==", decoded.uid)
      .where("isDefault", "==", true)
      .get();
    existingSnap.docs.forEach((d) => {
      if (d.id !== id) batch.update(d.ref, { isDefault: false });
    });
    batch.update(ref, { isDefault: true });
    batch.update(adminDb.collection("users").doc(decoded.uid), {
      defaultAddressId: id,
    });
  }

  await batch.commit();
  return NextResponse.json({ ok: true });
}

// DELETE /api/addresses/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ref = adminDb.collection("savedAddresses").doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userUid !== decoded.uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const batch = adminDb.batch();
  batch.delete(ref);

  // If this was the default, clear defaultAddressId on the user
  if (snap.data()?.isDefault) {
    batch.update(adminDb.collection("users").doc(decoded.uid), {
      defaultAddressId: null,
    });
  }

  await batch.commit();
  return NextResponse.json({ ok: true });
}
