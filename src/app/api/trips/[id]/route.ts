import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, assertHost, assertMembership } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";
import { geocodeAddress } from "@/lib/geocode";
import { z } from "zod";
import { IataCodeSchema } from "@/lib/validation";

const UpdateTripSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  airport: IataCodeSchema.optional(),
  baseAddress: z.string().min(1).max(300).optional(),
});

// GET /api/trips/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await assertMembership(decoded.uid, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snap = await adminDb.collection("trips").doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ trip: { id: snap.id, ...snap.data() } });
}

// PATCH /api/trips/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await assertHost(decoded.uid, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateTripSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.baseAddress) {
    updates.baseLatLng = await geocodeAddress(parsed.data.baseAddress);
  }

  await adminDb.collection("trips").doc(id).update(updates);
  return NextResponse.json({ ok: true });
}

// DELETE /api/trips/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await assertHost(decoded.uid, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete trip and all sub-collections in a batch
  const batch = adminDb.batch();
  batch.delete(adminDb.collection("trips").doc(id));

  const collections = ["memberships", "invites", "flights", "passengers"];
  await Promise.all(
    collections.map(async (col) => {
      const snap = await adminDb
        .collection(col)
        .where("tripId", "==", id)
        .get();
      snap.docs.forEach((d) => batch.delete(d.ref));
    })
  );

  await batch.commit();
  return NextResponse.json({ ok: true });
}
