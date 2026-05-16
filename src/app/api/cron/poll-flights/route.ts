import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { fetchFlightStatus } from "@/lib/aeroapi";

const LOCK_DOC = "pollLock";
const LOCK_TTL_MS = 4 * 60 * 1000; // 4 minutes — cron fires every 5

// GET /api/cron/poll-flights — called by Vercel Cron every 5 minutes
export async function GET(req: NextRequest) {
  // Verify the request came from Vercel's cron scheduler
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Distributed lock to prevent overlapping runs
  const lockRef = adminDb.collection("_internal").doc(LOCK_DOC);
  const lock = await lockRef.get();
  if (lock.exists) {
    const lockedAt = lock.data()?.lockedAt?.toMillis?.() ?? 0;
    if (Date.now() - lockedAt < LOCK_TTL_MS) {
      return NextResponse.json({ skipped: "already running" });
    }
  }
  await lockRef.set({ lockedAt: new Date() });

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // 1h ago
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h ahead

    // Only poll flights in the active window; skip arrived/cancelled
    const snap = await adminDb
      .collection("flights")
      .where("status", "not-in", ["arrived", "cancelled"])
      .get();

    const toUpdate = snap.docs.filter((d) => {
      const data = d.data();
      const relevantTime =
        data.direction === "arrival"
          ? data.estimatedArrival ?? data.scheduledArrival
          : data.estimatedDeparture ?? data.scheduledDeparture;
      if (!relevantTime) return false;
      const t = new Date(relevantTime).getTime();
      return t >= windowStart.getTime() && t <= windowEnd.getTime();
    });

    let updated = 0;
    let errors = 0;

    for (const doc of toUpdate) {
      const data = doc.data();
      try {
        const freshData = await fetchFlightStatus(data.flightNumber, data.date);
        await doc.ref.update(freshData);
        updated++;
      } catch {
        errors++;
      }
    }

    return NextResponse.json({ updated, errors, total: toUpdate.length });
  } finally {
    await lockRef.delete();
  }
}
