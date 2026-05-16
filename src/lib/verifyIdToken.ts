import { adminAuth } from "./firebaseAdmin";
import { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";

export async function verifyIdToken(req: NextRequest): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function assertMembership(
  uid: string,
  tripId: string
): Promise<boolean> {
  const { adminDb } = await import("./firebaseAdmin");
  const membershipId = `${tripId}_${uid}`;
  const doc = await adminDb.collection("memberships").doc(membershipId).get();
  return doc.exists;
}

export async function assertHost(
  uid: string,
  tripId: string
): Promise<boolean> {
  const { adminDb } = await import("./firebaseAdmin");
  const membershipId = `${tripId}_${uid}`;
  const doc = await adminDb.collection("memberships").doc(membershipId).get();
  return doc.exists && doc.data()?.role === "host";
}
