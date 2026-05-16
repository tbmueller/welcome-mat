export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number }> {
  const encoded = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${process.env.GOOGLE_MAPS_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding request failed");

  const data = await res.json();
  if (data.status !== "OK" || !data.results[0]) {
    throw new Error(`Geocoding failed: ${data.status}`);
  }

  return data.results[0].geometry.location;
}

export async function getTravelMinutes(
  originLatLng: { lat: number; lng: number },
  destination: string
): Promise<number> {
  const origin = `${originLatLng.lat},${originLatLng.lng}`;
  const dest = encodeURIComponent(destination);
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&mode=driving&departure_time=now&key=${process.env.GOOGLE_MAPS_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Distance Matrix request failed");

  const data = await res.json();
  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") {
    throw new Error("No route found");
  }

  // Use duration_in_traffic when available, fall back to duration
  const seconds =
    (element.duration_in_traffic ?? element.duration).value as number;
  return Math.ceil(seconds / 60);
}

export function buildDirectionsUrl(
  origin: string,
  iataCode: string,
  terminal: string | null,
  direction: "arrival" | "departure"
): string {
  const terminalPart = terminal ? ` Terminal ${terminal}` : "";
  const side = direction === "arrival" ? "Arrivals" : "Departures";
  const destination = `${iataCode}${terminalPart} ${side}`;
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
