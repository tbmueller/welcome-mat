"use client";

import { format, parseISO } from "date-fns";
import { api } from "@/lib/apiClient";
import type { FlightWithPassengers, FlightStatus } from "@/types";

type ExtendedFlight = FlightWithPassengers & { directionsUrl?: string };

const STATUS_STYLES: Record<FlightStatus, string> = {
  pending: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  scheduled: "bg-taupe-100 text-taupe-600 dark:bg-taupe-700 dark:text-taupe-300",
  departed: "bg-pink-100 text-pink-900 dark:bg-pink-900 dark:text-pink-400",
  en_route: "bg-pink-100 text-pink-900 dark:bg-pink-900 dark:text-pink-400",
  landed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  arrived: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  diverted: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  unknown: "bg-taupe-100 text-taupe-400 dark:bg-taupe-700 dark:text-taupe-500",
};

const STATUS_LABELS: Record<FlightStatus, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  departed: "Departed",
  en_route: "En route",
  landed: "Landed",
  arrived: "Arrived",
  cancelled: "Cancelled",
  diverted: "Diverted",
  unknown: "Unknown",
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(parseISO(iso), "h:mm a");
}

interface Props {
  flight: ExtendedFlight;
  isHost: boolean;
  currentUserUid: string;
  onRemoved?: () => void;
}

export function FlightCard({ flight, isHost, currentUserUid, onRemoved }: Props) {
  const isArrival = flight.direction === "arrival";

  const scheduledTime = isArrival ? flight.scheduledArrival : flight.scheduledDeparture;
  const estimatedTime = isArrival ? flight.estimatedArrival : flight.estimatedDeparture;
  const terminal = isArrival ? flight.arrivalTerminal : flight.departureTerminal;
  const gate = isArrival ? flight.arrivalGate : flight.departureGate;

  const isDelayed =
    estimatedTime &&
    scheduledTime &&
    new Date(estimatedTime) > new Date(scheduledTime);

  const isPassenger = flight.passengers?.some((p) => p.userUid === currentUserUid);

  async function handleRemove() {
    if (!confirm("Remove yourself from this flight?")) return;
    await api.delete(`/api/flights/${flight.id}`);
    onRemoved?.();
  }

  return (
    <li className="rounded-xl border border-taupe-200 bg-white p-4 shadow-sm dark:border-taupe-700 dark:bg-taupe-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Flight number + status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold">{flight.flightNumber}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[flight.status]}`}
            >
              {STATUS_LABELS[flight.status]}
            </span>
            {isDelayed && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                Delayed
              </span>
            )}
          </div>

          {/* Airline */}
          {flight.airline && (
            <p className="mt-0.5 text-xs text-taupe-400 dark:text-taupe-500">{flight.airline}</p>
          )}

          {/* Time */}
          <div className="mt-2 flex items-center gap-3 text-sm">
            {isDelayed ? (
              <>
                <span className="line-through text-taupe-400 dark:text-taupe-500">{fmt(scheduledTime)}</span>
                <span className="font-medium text-amber-700 dark:text-amber-400">{fmt(estimatedTime)}</span>
              </>
            ) : (
              <span className="font-medium">{fmt(estimatedTime ?? scheduledTime)}</span>
            )}
            {terminal && (
              <span className="text-taupe-400 dark:text-taupe-500">
                Terminal {terminal}
                {gate ? `, Gate ${gate}` : ""}
              </span>
            )}
          </div>

          {/* Passengers */}
          {flight.passengers && flight.passengers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {flight.passengers.map((p) => (
                <span
                  key={p.userUid}
                  className="rounded-full bg-taupe-100 px-2 py-0.5 text-xs text-taupe-600 dark:bg-taupe-700 dark:text-taupe-300"
                >
                  {p.displayName}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Host-only: leave-by + directions */}
        {isHost && (
          <div className="shrink-0 text-right">
            {flight.leaveBy && (
              <div className="mb-1">
                <p className="text-xs text-taupe-400 dark:text-taupe-500">Leave by</p>
                <p className="font-semibold text-pink-900 dark:text-pink-400">
                  {format(parseISO(flight.leaveBy), "h:mm a")}
                </p>
                {flight.travelMinutes && (
                  <p className="text-xs text-taupe-400 dark:text-taupe-500">{flight.travelMinutes} min drive</p>
                )}
              </div>
            )}
            {flight.directionsUrl && (
              <a
                href={flight.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg bg-pink-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-pink-900"
              >
                Directions
              </a>
            )}
          </div>
        )}
      </div>

      {/* Remove button for passengers */}
      {isPassenger && !isHost && (
        <button
          onClick={handleRemove}
          className="mt-3 text-xs text-red-500 hover:underline dark:text-red-400"
        >
          Remove me from this flight
        </button>
      )}
    </li>
  );
}
