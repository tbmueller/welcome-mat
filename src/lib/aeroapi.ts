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
  date: string
): Promise<Partial<Flight> | null> {
  const url = new URL(`${AEROAPI_BASE}/flights/${encodeURIComponent(flightNumber)}`);
  // Narrow the search window to ±1 day around the flight date
  const start = new Date(date);
  start.setDate(start.getDate() - 1);
  const end = new Date(date);
  end.setDate(end.getDate() + 1);
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

  if (!res.ok) throw new Error(`AeroAPI error: ${res.status}`);

  const data = await res.json();
  const flight: AeroApiFlight | undefined = data.flights?.[0];
  if (!flight) return null;

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
