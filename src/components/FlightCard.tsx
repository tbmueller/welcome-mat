"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Button, Select } from "@radix-ui/themes";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import { api } from "@/lib/apiClient";
import type { FlightWithPassengers, FlightStatus } from "@/types";

type ExtendedFlight = FlightWithPassengers & { directionsUrl?: string };

interface Member {
  userUid: string;
  displayName: string;
}

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
  allMembers?: Member[];
  onRemoved?: () => void;
  onPassengersChanged?: () => void;
}

export function FlightCard({ flight, isHost, currentUserUid, allMembers = [], onRemoved, onPassengersChanged }: Props) {
  const isArrival = flight.direction === "arrival";
  const scheduledTime = isArrival ? flight.scheduledArrival : flight.scheduledDeparture;
  const estimatedTime = isArrival ? flight.estimatedArrival : flight.estimatedDeparture;
  const terminal = isArrival ? flight.arrivalTerminal : flight.departureTerminal;
  const gate = isArrival ? flight.arrivalGate : flight.departureGate;
  const isDelayed = estimatedTime && scheduledTime && new Date(estimatedTime) > new Date(scheduledTime);
  const isPassenger = flight.passengers?.some((p) => p.userUid === currentUserUid);

  const [showAddGuest, setShowAddGuest] = useState(false);
  const [addingUid, setAddingUid] = useState("");
  const [removingUid, setRemovingUid] = useState<string | null>(null);

  const passengerUids = new Set(flight.passengers?.map((p) => p.userUid) ?? []);
  const availableGuests = allMembers.filter((m) => !passengerUids.has(m.userUid));

  async function handleAddGuest(uid: string) {
    if (!uid) return;
    setAddingUid(uid);
    try {
      await api.post(`/api/flights/${flight.id}/passengers`, { passengerUid: uid });
      onPassengersChanged?.();
      setShowAddGuest(false);
      setAddingUid("");
    } catch {
      setAddingUid("");
    }
  }

  async function handleRemovePassenger(uid: string) {
    setRemovingUid(uid);
    try {
      await api.delete(`/api/flights/${flight.id}/passengers/${uid}`);
      onPassengersChanged?.();
    } finally {
      setRemovingUid(null);
    }
  }

  async function handleRemoveSelf() {
    if (!confirm("Remove yourself from this flight?")) return;
    await api.delete(`/api/flights/${flight.id}/passengers/${currentUserUid}`);
    onRemoved?.();
  }

  return (
    <li className="rounded-xl border border-taupe-200 bg-white p-4 shadow-sm dark:border-taupe-700 dark:bg-taupe-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold">{flight.flightNumber}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[flight.status]}`}>
              {STATUS_LABELS[flight.status]}
            </span>
            {isDelayed && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                Delayed
              </span>
            )}
          </div>

          {flight.airline && (
            <p className="mt-0.5 text-xs text-taupe-400 dark:text-taupe-500">{flight.airline}</p>
          )}

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
                Terminal {terminal}{gate ? `, Gate ${gate}` : ""}
              </span>
            )}
          </div>

          {/* Passengers */}
          {(flight.passengers && flight.passengers.length > 0 || isHost) && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {flight.passengers?.map((p) => (
                  <span
                    key={p.userUid}
                    className="inline-flex items-center gap-1 rounded-full bg-taupe-100 pl-2.5 pr-1.5 py-0.5 text-xs text-taupe-600 dark:bg-taupe-700 dark:text-taupe-300"
                  >
                    {p.displayName}
                    {isHost && (
                      <button
                        onClick={() => handleRemovePassenger(p.userUid)}
                        disabled={removingUid === p.userUid}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-taupe-200 dark:hover:bg-taupe-600 disabled:opacity-50"
                        aria-label={`Remove ${p.displayName}`}
                      >
                        <Cross2Icon className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </span>
                ))}

                {isHost && availableGuests.length > 0 && (
                  showAddGuest ? (
                    <Select.Root onValueChange={handleAddGuest} disabled={!!addingUid}>
                      <Select.Trigger placeholder="Add guest…" className="h-6 text-xs" />
                      <Select.Content>
                        {availableGuests.map((g) => (
                          <Select.Item key={g.userUid} value={g.userUid}>
                            {g.displayName}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  ) : (
                    <button
                      onClick={() => setShowAddGuest(true)}
                      className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-taupe-300 px-2 py-0.5 text-xs text-taupe-400 hover:border-[var(--accent-9)] hover:text-[var(--accent-11)] dark:border-taupe-600"
                    >
                      <PlusIcon className="h-3 w-3" />
                      Add guest
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {isHost && (
          <div className="shrink-0 text-right">
            {flight.leaveBy && (
              <div className="mb-1">
                <p className="text-xs text-taupe-400 dark:text-taupe-500">Leave by</p>
                <p className="font-semibold text-[var(--accent-11)]">
                  {format(parseISO(flight.leaveBy), "h:mm a")}
                </p>
                {flight.travelMinutes && (
                  <p className="text-xs text-taupe-400 dark:text-taupe-500">{flight.travelMinutes} min drive</p>
                )}
              </div>
            )}
            {flight.directionsUrl && (
              <Button asChild size="1">
                <a href={flight.directionsUrl} target="_blank" rel="noopener noreferrer">
                  Directions
                </a>
              </Button>
            )}
          </div>
        )}
      </div>

      {isPassenger && !isHost && (
        <Button variant="ghost" color="red" size="1" onClick={handleRemoveSelf} className="mt-3">
          <Cross2Icon width={14} height={14} /> Remove me from this flight
        </Button>
      )}
    </li>
  );
}
