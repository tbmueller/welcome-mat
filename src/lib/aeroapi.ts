import type { Flight, FlightStatus } from "@/types";

interface AeroApiFlight {
  ident: string;
  operator: string;
  scheduled_out: string | null;
  estimated_out: string | null;
  scheduled_in: string | null;
  estimated_in: string | null;
  origin: { code_iata: string } | null;
  destination: { code_iata: string } | null;
  terminal_origin: string | null;
  terminal_destination: string | null;
  gate_origin: string | null;
  gate_destination: string | null;
  status: string;
}

const AEROAPI_BASE = "https://aeroapi.flightaware.com/aeroapi";

function mapStatus(raw: string): FlightStatus {
  const s = raw.toLowerCase();
  if (s.includes("scheduled")) return "scheduled";
  if (s.includes("departed") || s.includes("taxiing")) return "departed";
  if (s.includes("en route") || s.includes("airborne")) return "en_route";
  if (s.includes("landed")) return "landed";
  if (s.includes("arrived")) return "arrived";
  if (s.includes("cancelled")) return "cancelled";
  if (s.includes("diverted")) return "diverted";
  return "unknown";
}

export async function fetchFlightStatus(
  flightNumber: string,
  date: string,
  /** Previously stored scheduledDeparture — used to pin to the correct leg when
   *  a flight number operates multiple times per day (e.g. UA1486 has two legs
   *  on 5/22). Without this hint we'd risk toggling between legs on every poll. */
  knownScheduledDeparture?: string | null
): Promise<Partial<Flight> | null> {
  const url = new URL(`${AEROAPI_BASE}/flights/${encodeURIComponent(flightNumber)}`);
  // ±2 days in UTC to avoid cutting off late-night departures.
  // new Date("YYYY-MM-DD") is UTC midnight, so a flight at 11pm Pacific is
  // 06:00 UTC the next calendar day — it falls outside a ±1 day window.
  const start = new Date(date);
  start.setDate(start.getDate() - 1);
  const end = new Date(date);
  end.setDate(end.getDate() + 2);
  url.searchParams.set("start", start.toISOString());
  url.searchParams.set("end", end.toISOString());
  url.searchParams.set("max_pages", "1");

  const res = await fetch(url.toString(), {
    headers: {
      "x-apikey": process.env.AEROAPI_KEY!,
      Accept: "application/json; charset=UTF-8",
    },
    next: { revalidate: 0 },
  });

  // 400 / 404 mean AeroAPI doesn't recognise this ident yet — future schedule
  // not loaded, IATA↔ICAO mapping gap, or flight simply not in their system.
  // Treat both as "no data": the caller creates the flight as "pending" and
  // the cron retries automatically once AeroAPI has data.
  // 401 / 429 / 5xx are real errors we want to surface.
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(`AeroAPI error: ${res.status}`);

  const data = await res.json();
  const all: AeroApiFlight[] = data.flights ?? [];
  if (all.length === 0) return null;

  let flight: AeroApiFlight | undefined;

  if (knownScheduledDeparture) {
    // We already know which leg we want — find the one whose scheduled_out
    // matches exactly. This prevents the cron from bouncing between legs.
    flight = all.find((f) => f.scheduled_out === knownScheduledDeparture);
  }

  if (!flight) {
    // First fetch (or scheduled time changed): take the earliest departure
    // whose scheduled_out date portion matches the given date in UTC.
    // Sorting ensures consistent selection when multiple legs share a date.
    const onDate = all
      .filter((f) => f.scheduled_out?.startsWith(date))
      .sort((a, b) => (a.scheduled_out ?? "").localeCompare(b.scheduled_out ?? ""));
    flight = onDate[0] ?? all[0]; // last resort: take first result
  }

  return {
    airline: flight.operator,
    scheduledDeparture: flight.scheduled_out,
    // Store null when AeroAPI has no estimate yet — don't fall back to scheduled.
    // Falling back hides delay state: if estimated_out is null because the delay
    // hasn't been confirmed, we'd show the scheduled time and nothing looks wrong.
    estimatedDeparture: flight.estimated_out ?? null,
    departureAirport: flight.origin?.code_iata ?? null,
    departureTerminal: flight.terminal_origin,
    departureGate: flight.gate_origin,
    scheduledArrival: flight.scheduled_in,
    estimatedArrival: flight.estimated_in ?? null,
    arrivalAirport: flight.destination?.code_iata ?? null,
    arrivalTerminal: flight.terminal_destination,
    arrivalGate: flight.gate_destination,
    status: mapStatus(flight.status),
    lastPolled: new Date().toISOString(),
  };
}
