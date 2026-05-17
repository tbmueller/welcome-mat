import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";

// PATCH /api/notifications/[id] — mark a notification as read
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ref = adminDb.collection("notifications").doc(id);
  const snap = await ref.get();

  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (snap.data()?.hostUid !== decoded.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ref.update({ read: true });
  return NextResponse.json({ ok: true });
}
