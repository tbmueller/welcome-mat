import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/verifyIdToken";

export async function GET(req: NextRequest) {
  const user = await verifyIdToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = req.nextUrl.searchParams.get("input")?.trim();
  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) return NextResponse.json({ predictions: [] });

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("types", "address");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  const data = await res.json();

  const predictions = (data.predictions ?? []).map((p: { description: string; place_id: string }) => ({
    description: p.description,
    placeId: p.place_id,
  }));

  return NextResponse.json({ predictions });
}
