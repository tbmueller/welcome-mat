import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";

// GET /api/notifications — unread notifications for the current user
export async function GET(req: NextRequest) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb
    .collection("notifications")
    .where("hostUid", "==", decoded.uid)
    .where("read", "==", false)
    .limit(20)
    .get();

  const notifications = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as { createdAt: string }) }))
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  return NextResponse.json({ notifications });
}
