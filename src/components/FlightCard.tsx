"use client";

import { format, parseISO } from "date-fns";
import { api } from "@/lib/apiClient";
import type { FlightWithPassengers, FlightStatus } from "@/types";

type ExtendedFlight = FlightWithPassengers & { directionsUrl?: string };

const STATUS_STYLES: Record<FlightStatus, string> = {
  scheduled: "bg-gray-100 text-gray-600",
  departed: "bg-blue-100 text-blue-700",
  en_route: "bg-blue-100 text-blue-700",
  landed: "bg-green-100 text-green-700",
  arrived: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  diverted: "bg-orange-100 text-orange-700",
  unknown: "bg-gray-100 text-gray-400",
};

const STATUS_LABELS: Record<FlightStatus, string> = {
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
    <li className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Delayed
              </span>
            )}
          </div>

          {/* Airline */}
          {flight.airline && (
            <p className="mt-0.5 text-xs text-gray-400">{flight.airline}</p>
          )}

          {/* Time */}
          <div className="mt-2 flex items-center gap-3 text-sm">
            {isDelayed ? (
              <>
                <span className="line-through text-gray-400">{fmt(scheduledTime)}</span>
                <span className="font-medium text-amber-700">{fmt(estimatedTime)}</span>
              </>
            ) : (
              <span className="font-medium">{fmt(estimatedTime ?? scheduledTime)}</span>
            )}
            {terminal && (
              <span className="text-gray-400">
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
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
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
                <p className="text-xs text-gray-400">Leave by</p>
                <p className="font-semibold text-blue-700">
                  {format(parseISO(flight.leaveBy), "h:mm a")}
                </p>
                {flight.travelMinutes && (
                  <p className="text-xs text-gray-400">{flight.travelMinutes} min drive</p>
                )}
              </div>
            )}
            {flight.directionsUrl && (
              <a
                href={flight.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
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
          className="mt-3 text-xs text-red-500 hover:underline"
        >
          Remove me from this flight
        </button>
      )}
    </li>
  );
}
