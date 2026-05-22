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
  destination: string,
  /** Unix timestamp (seconds). When provided and in the future, Maps uses
   *  historical traffic patterns for that time of day. Falls back to live
   *  traffic when omitted or when the time is already in the past. */
  departureTimeUnix?: number
): Promise<number> {
  const origin = `${originLatLng.lat},${originLatLng.lng}`;
  const dest = encodeURIComponent(destination);
  const depTime =
    departureTimeUnix && departureTimeUnix > Date.now() / 1000
      ? departureTimeUnix
      : "now";
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&mode=driving&departure_time=${depTime}&key=${process.env.GOOGLE_MAPS_KEY}`;

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

/** Builds the airport destination string used for both Distance Matrix and
 *  the directions URL — e.g. "SFO Terminal 2 Arrivals" or "SFO Departures". */
export function buildAirportDestination(
  iataCode: string,
  terminal: string | null | undefined,
  direction: "arrival" | "departure"
): string {
  const terminalPart = terminal ? ` Terminal ${terminal}` : "";
  const side = direction === "arrival" ? "Arrivals" : "Departures";
  return `${iataCode}${terminalPart} ${side}`;
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
