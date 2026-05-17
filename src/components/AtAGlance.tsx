"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import type { FlightWithPassengers, SavedAddress } from "@/types";

type ExtendedFlight = FlightWithPassengers & { directionsUrl?: string };

interface Origin {
  id: string;
  label: string;
  address: string;
  latLng: { lat: number; lng: number } | null;
}

interface Props {
  flights: ExtendedFlight[];
  trip: { baseAddress: string; baseLatLng: { lat: number; lng: number } };
  savedAddresses: SavedAddress[];
  onOriginChange: (latLng: { lat: number; lng: number } | null, address: string | null) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "now";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(parseISO(iso), "h:mm a");
}

export function AtAGlance({ flights, trip, savedAddresses, onOriginChange, onRefresh, refreshing }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [selectedOriginId, setSelectedOriginId] = useState("trip");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const matchingSaved = savedAddresses.find((a) => a.address === trip.baseAddress);

  const origins: Origin[] = [
    {
      id: "trip",
      label: matchingSaved ? matchingSaved.label : "Trip base",
      address: trip.baseAddress,
      latLng: trip.baseLatLng,
    },
    ...savedAddresses
      .filter((a) => a.address !== trip.baseAddress)
      .map((a) => ({ id: a.id, label: a.label, address: a.address, latLng: a.latLng })),
  ];

  function handleOriginChange(id: string) {
    setSelectedOriginId(id);
    const origin = origins.find((o) => o.id === id);
    if (!origin) return;
    if (id === "trip") {
      onOriginChange(null, null); // revert to trip default
    } else {
      onOriginChange(origin.latLng, origin.address);
    }
  }

  // Sort upcoming flights by their relevant time; exclude arrived/cancelled
  const upcoming = flights
    .filter((f) => f.status !== "arrived" && f.status !== "cancelled")
    .map((f) => {
      const relevantTime =
        f.direction === "arrival"
          ? f.estimatedArrival ?? f.scheduledArrival
          : f.estimatedDeparture ?? f.scheduledDeparture;
      const ms = relevantTime ? new Date(relevantTime).getTime() - now : null;
      const isDelayed =
        f.direction === "arrival"
          ? !!(f.estimatedArrival && f.scheduledArrival && new Date(f.estimatedArrival) > new Date(f.scheduledArrival))
          : !!(f.estimatedDeparture && f.scheduledDeparture && new Date(f.estimatedDeparture) > new Date(f.scheduledDeparture));
      return { flight: f, relevantTime, ms, isDelayed };
    })
    .filter((x) => x.ms === null || x.ms > -60 * 60_000) // hide flights that happened > 1h ago
    .sort((a, b) => {
      if (!a.relevantTime) return 1;
      if (!b.relevantTime) return -1;
      return new Date(a.relevantTime).getTime() - new Date(b.relevantTime).getTime();
    });

  const delayedCount = upcoming.filter((x) => x.isDelayed).length;

  if (upcoming.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-rose-900 dark:text-rose-200">At a glance</h2>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-xs text-rose-800 hover:underline disabled:opacity-50 dark:text-rose-600"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Address picker */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-rose-900 dark:text-rose-400 whitespace-nowrap">Departing from</span>
        <select
          value={selectedOriginId}
          onChange={(e) => handleOriginChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-rose-400 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-rose-700 dark:border-rose-900 dark:bg-taupe-800 dark:text-taupe-100"
        >
          {origins.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Delay banner */}
      {delayedCount > 0 && (
        <div className="mb-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          ⚠ {delayedCount} flight{delayedCount > 1 ? "s" : ""} delayed
        </div>
      )}

      {/* Flight rows */}
      <ul className="space-y-2">
        {upcoming.map(({ flight: f, ms, isDelayed }) => (
          <li
            key={f.id}
            className="flex flex-col gap-1 rounded-lg bg-white px-3 py-2.5 shadow-sm dark:bg-taupe-800"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-sm">{f.flightNumber}</span>
                <span className="rounded-full bg-taupe-100 px-2 py-0.5 text-xs text-taupe-600 dark:bg-taupe-700 dark:text-taupe-300">
                  {f.direction === "arrival" ? "Arrival" : "Departure"}
                </span>
                {isDelayed && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    Delayed
                  </span>
                )}
              </div>
              {ms !== null && (
                <span className={`text-xs font-medium tabular-nums ${ms < 0 ? "text-taupe-400 dark:text-taupe-500" : "text-rose-900 dark:text-rose-400"}`}>
                  {ms < 0 ? `${formatCountdown(-ms)} ago` : `in ${formatCountdown(ms)}`}
                </span>
              )}
            </div>

            {/* Leave-by row */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-taupe-500 dark:text-taupe-400">
                {f.leaveBy ? (
                  <>
                    <span>Leave by <span className="font-semibold text-taupe-800 dark:text-taupe-100">{fmt(f.leaveBy)}</span></span>
                    {f.travelMinutes && <span className="text-taupe-400 dark:text-taupe-500">· {f.travelMinutes} min drive</span>}
                  </>
                ) : (
                  <span className="text-taupe-400 dark:text-taupe-500">Travel time unavailable</span>
                )}
              </div>
              {f.directionsUrl && (
                <a
                  href={f.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-rose-800 hover:underline dark:text-rose-600"
                >
                  Directions ↗
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
