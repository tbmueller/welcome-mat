import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, assertHost } from "@/lib/verifyIdToken";
import { adminDb } from "@/lib/firebaseAdmin";
import { CreateInviteSchema } from "@/lib/validation";
import { FieldValue } from "firebase-admin/firestore";
import { Resend } from "resend";
import crypto from "crypto";
import { rateLimits } from "@/lib/ratelimit";

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/invites — create an invite (link or email)
export async function POST(req: NextRequest) {
  const decoded = await verifyIdToken(req);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tripId, email, maxUses } = parsed.data;

  const limited = await rateLimits.invite(req, decoded.uid);
  if (limited) return limited;

  if (!(await assertHost(decoded.uid, tripId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const ref = adminDb.collection("invites").doc();
  await ref.set({
    tripId,
    token,
    email: email ?? null,
    maxUses: email ? 1 : (maxUses ?? 1),
    useCount: 0,
    usedByUids: [],
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: expiresAt.toISOString(),
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${token}`;

  if (email) {
    const tripSnap = await adminDb.collection("trips").doc(tripId).get();
    const tripName = tripSnap.data()?.name ?? "a trip";

    await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: email,
      subject: `You're invited to join "${tripName}"`,
      html: `<p>You've been invited to track flights for <strong>${tripName}</strong>.</p>
             <p><a href="${inviteUrl}">Accept invitation</a></p>
             <p>This link expires in 7 days.</p>`,
    });
  }

  return NextResponse.json({ token, inviteUrl });
}
