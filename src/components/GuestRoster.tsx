"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { AlertDialog, Button } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import { api } from "@/lib/apiClient";
import type { FlightWithPassengers, FlightStatus } from "@/types";
import { AddFlightModal } from "@/components/AddFlightModal";

type ExtendedFlight = FlightWithPassengers & { directionsUrl?: string };

export interface TripMember {
  userUid: string;
  displayName: string;
  role: "host" | "guest";
  photoURL: string | null;
}

interface Props {
  flights: ExtendedFlight[];
  members: TripMember[];
  isHost: boolean;
  currentUserUid: string;
  tripId: string;
  onChanged: () => void;
  onInvite: () => void;
}

const STATUS_STYLES: Record<FlightStatus, string> = {
  pending:   "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  scheduled: "bg-taupe-100 text-taupe-600 dark:bg-taupe-700 dark:text-taupe-300",
  departed:  "bg-pink-100 text-pink-900 dark:bg-pink-900 dark:text-pink-400",
  en_route:  "bg-pink-100 text-pink-900 dark:bg-pink-900 dark:text-pink-400",
  landed:    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  arrived:   "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  diverted:  "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  unknown:   "bg-taupe-100 text-taupe-400 dark:bg-taupe-700 dark:text-taupe-500",
};

const STATUS_LABELS: Record<FlightStatus, string> = {
  pending:   "Pending",
  scheduled: "Scheduled",
  departed:  "Departed",
  en_route:  "En route",
  landed:    "Landed",
  arrived:   "Arrived",
  cancelled: "Cancelled",
  diverted:  "Diverted",
  unknown:   "Unknown",
};

function fmtShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(parseISO(iso), "MMM d '·' h:mm a");
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function GuestRoster({
  flights,
  members,
  isHost,
  currentUserUid,
  tripId,
  onChanged,
  onInvite,
}: Props) {
  const [pendingAdd, setPendingAdd] = useState<{
    guest: TripMember;
    direction: "arrival" | "departure";
  } | null>(null);
  const [removingFlight, setRemovingFlight] = useState<string | null>(null);
  const [confirmGuest, setConfirmGuest] = useState<TripMember | null>(null);
  const [removingGuest, setRemovingGuest] = useState(false);

  async function handleRemoveFromFlight(flightId: string, uid: string) {
    const key = `${flightId}_${uid}`;
    setRemovingFlight(key);
    try {
      await api.delete(`/api/flights/${flightId}/passengers/${uid}`);
      onChanged();
    } finally {
      setRemovingFlight(null);
    }
  }

  async function handleConfirmRemoveGuest() {
    if (!confirmGuest) return;
    setRemovingGuest(true);
    try {
      await api.delete(`/api/trips/${tripId}/members`, { userUid: confirmGuest.userUid });
      onChanged();
      setConfirmGuest(null);
    } finally {
      setRemovingGuest(false);
    }
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-taupe-400 dark:text-taupe-500">
        Guests
      </h2>

      {members.length === 0 ? (
        <p className="text-sm text-taupe-400 dark:text-taupe-500">No guests yet.</p>
      ) : (
        <ul className="space-y-3">
          {members.map((member) => {
            const memberFlights = flights.filter((f) =>
              f.passengers.some((p) => p.userUid === member.userUid)
            );
            const arrival = memberFlights.find((f) => f.direction === "arrival");
            const departure = memberFlights.find((f) => f.direction === "departure");

            // Can add/remove flights for this row
            const canAct = isHost || member.userUid === currentUserUid;
            // Host can remove any non-host guest (but not themselves via this UI)
            const canRemoveGuest =
              isHost &&
              member.userUid !== currentUserUid &&
              member.role !== "host";

            return (
              <li
                key={member.userUid}
                className="rounded-xl border border-taupe-200 bg-white p-4 shadow-sm dark:border-taupe-700 dark:bg-taupe-800"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {member.photoURL ? (
                      <img
                        src={member.photoURL}
                        alt={member.displayName}
                        className="h-8 w-8 rounded-full flex-shrink-0 object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-[var(--accent-3)] flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-[var(--accent-11)]">
                          {initials(member.displayName)}
                        </span>
                      </div>
                    )}
                    <span className="font-medium text-sm truncate">
                      {member.displayName}
                    </span>
                    {member.role === "host" && (
                      <span className="flex-shrink-0 rounded-full bg-taupe-100 px-2 py-0.5 text-xs text-taupe-500 dark:bg-taupe-700 dark:text-taupe-400">
                        Host
                      </span>
                    )}
                    {member.userUid === currentUserUid && (
                      <span className="flex-shrink-0 rounded-full bg-taupe-100 px-2 py-0.5 text-xs text-taupe-500 dark:bg-taupe-700 dark:text-taupe-400">
                        You
                      </span>
                    )}
                  </div>

                  {canRemoveGuest && (
                    <button
                      onClick={() => setConfirmGuest(member)}
                      className="flex-shrink-0 text-xs text-taupe-400 hover:text-red-500 dark:text-taupe-500 dark:hover:text-red-400 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Flights */}
                <div className="mt-3 space-y-2">
                  {!arrival && !departure && (
                    <p className="text-xs text-taupe-400 dark:text-taupe-500">
                      No flights yet
                    </p>
                  )}
                  {arrival && (
                    <FlightRow
                      flight={arrival}
                      direction="arrival"
                      canRemove={canAct}
                      removing={removingFlight === `${arrival.id}_${member.userUid}`}
                      onRemove={() => handleRemoveFromFlight(arrival.id, member.userUid)}
                    />
                  )}
                  {departure && (
                    <FlightRow
                      flight={departure}
                      direction="departure"
                      canRemove={canAct}
                      removing={removingFlight === `${departure.id}_${member.userUid}`}
                      onRemove={() => handleRemoveFromFlight(departure.id, member.userUid)}
                    />
                  )}
                </div>

                {/* Add flight buttons */}
                {canAct && (!arrival || !departure) && (
                  <div className="mt-3 flex gap-3">
                    {!arrival && (
                      <button
                        onClick={() => setPendingAdd({ guest: member, direction: "arrival" })}
                        className="text-xs font-medium text-[var(--accent-11)] hover:underline"
                      >
                        + Add arrival
                      </button>
                    )}
                    {!departure && (
                      <button
                        onClick={() =>
                          setPendingAdd({ guest: member, direction: "departure" })
                        }
                        className="text-xs font-medium text-[var(--accent-11)] hover:underline"
                      >
                        + Add departure
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Invite button */}
      {isHost && (
        <button
          onClick={onInvite}
          className="mt-3 w-full rounded-lg border-2 border-dashed border-taupe-300 py-3 text-sm text-taupe-500 transition hover:border-[var(--accent-9)] hover:text-[var(--accent-11)] dark:border-taupe-600 dark:text-taupe-400"
        >
          + Invite guest
        </button>
      )}

      {/* Add flight modal */}
      {pendingAdd && (
        <AddFlightModal
          tripId={tripId}
          isHost={isHost}
          members={members}
          preselectedGuest={pendingAdd.guest}
          preselectedDirection={pendingAdd.direction}
          existingFlights={flights.filter(
            (f) =>
              f.direction === pendingAdd.direction &&
              !f.passengers.some((p) => p.userUid === pendingAdd.guest.userUid)
          )}
          onClose={() => setPendingAdd(null)}
          onAdded={() => {
            setPendingAdd(null);
            onChanged();
          }}
        />
      )}

      {/* Remove guest confirmation */}
      <AlertDialog.Root
        open={confirmGuest !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmGuest(null);
        }}
      >
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>
            Remove {confirmGuest?.displayName}?
          </AlertDialog.Title>
          <AlertDialog.Description>
            This will remove them from the trip and all their assigned flights.
            This cannot be undone.
          </AlertDialog.Description>
          <div className="mt-4 flex justify-end gap-3">
            <AlertDialog.Cancel>
              <Button variant="outline" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                color="red"
                disabled={removingGuest}
                onClick={handleConfirmRemoveGuest}
              >
                {removingGuest ? "Removing…" : "Remove"}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </section>
  );
}

interface FlightRowProps {
  flight: ExtendedFlight;
  direction: "arrival" | "departure";
  canRemove: boolean;
  removing: boolean;
  onRemove: () => void;
}

function FlightRow({ flight, direction, canRemove, removing, onRemove }: FlightRowProps) {
  const time =
    direction === "arrival"
      ? flight.estimatedArrival ?? flight.scheduledArrival
      : flight.estimatedDeparture ?? flight.scheduledDeparture;

  const otherPassengers = flight.passengers.filter((p, i, arr) =>
    arr.findIndex((q) => q.userUid === p.userUid) === i
  );

  return (
    <div className="flex items-center gap-2 rounded-lg bg-taupe-50 px-3 py-2 dark:bg-taupe-700/50">
      <span className="flex-shrink-0 text-sm text-taupe-400 dark:text-taupe-500">
        {direction === "arrival" ? "↘" : "↗"}
      </span>
      <span className="flex-shrink-0 font-mono text-sm font-semibold">
        {flight.flightNumber}
      </span>
      <span className="flex-shrink-0 text-xs text-taupe-500 dark:text-taupe-400">
        {fmtShort(time)}
      </span>
      <span
        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[flight.status]}`}
      >
        {STATUS_LABELS[flight.status]}
      </span>
      {otherPassengers.length > 1 && (
        <span className="truncate text-xs text-taupe-400 dark:text-taupe-500">
          · {otherPassengers.map((p) => p.displayName).join(", ")}
        </span>
      )}
      {canRemove && (
        <button
          onClick={onRemove}
          disabled={removing}
          className="ml-auto flex-shrink-0 text-taupe-400 transition hover:text-red-500 disabled:opacity-40 dark:text-taupe-500 dark:hover:text-red-400"
          aria-label="Remove from flight"
        >
          <Cross2Icon />
        </button>
      )}
    </div>
  );
}
