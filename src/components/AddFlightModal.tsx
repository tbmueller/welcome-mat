"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Button, TextField } from "@radix-ui/themes";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { Modal } from "@/components/Modal";
import type { FlightWithPassengers } from "@/types";

type ExtendedFlight = FlightWithPassengers & { directionsUrl?: string };

interface Member {
  userUid: string;
  displayName: string;
  role?: string;
  photoURL?: string | null;
}

interface Props {
  tripId: string;
  isHost?: boolean;
  members?: Member[];
  /** Pre-scope the modal to a specific guest — locks the guest field. */
  preselectedGuest?: Member;
  /** Pre-scope the modal to a specific direction — locks the direction toggle. */
  preselectedDirection?: "arrival" | "departure";
  /** Flights in the preselected direction that this guest is NOT already on. */
  existingFlights?: ExtendedFlight[];
  onClose: () => void;
  onAdded?: () => void;
}

function fmtShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(parseISO(iso), "MMM d '·' h:mm a");
}

export function AddFlightModal({
  tripId,
  isHost,
  members = [],
  preselectedGuest,
  preselectedDirection,
  existingFlights = [],
  onClose,
  onAdded,
}: Props) {
  const { user } = useAuth();

  const [direction, setDirection] = useState<"arrival" | "departure">(
    preselectedDirection ?? "arrival"
  );
  const [guestName, setGuestName] = useState(preselectedGuest?.displayName ?? "");
  const [selectedGuestUid, setSelectedGuestUid] = useState<string | null>(
    preselectedGuest?.userUid ?? null
  );
  const [flightNumber, setFlightNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingExistingId, setAddingExistingId] = useState<string | null>(null);

  const guests = members.filter((m) => m.userUid !== user?.uid);
  const guestLocked = !!preselectedGuest;
  const directionLocked = !!preselectedDirection;

  function pickGuest(m: Member) {
    setGuestName(m.displayName);
    setSelectedGuestUid(m.userUid);
  }

  function handleGuestNameChange(name: string) {
    setGuestName(name);
    setSelectedGuestUid(null);
  }

  /** Add the guest to an existing flight (no AeroAPI call). */
  async function handleAddToExisting(flight: ExtendedFlight) {
    const passengerUid = preselectedGuest?.userUid ?? user?.uid;
    if (!passengerUid) return;
    setAddingExistingId(flight.id);
    setError("");
    try {
      await api.post(`/api/flights/${flight.id}/passengers`, { passengerUid });
      onAdded?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add to flight");
      setAddingExistingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let passengerUid: string | undefined;
      if (isHost) {
        if (preselectedGuest) {
          passengerUid = preselectedGuest.userUid;
        } else if (selectedGuestUid) {
          passengerUid = selectedGuestUid;
        } else {
          const { userUid } = await api.post<{ userUid: string; displayName: string }>(
            `/api/trips/${tripId}/members`,
            { displayName: guestName.trim() }
          );
          passengerUid = userUid;
        }
      }
      await api.post("/api/flights", {
        flightNumber: flightNumber.trim().toUpperCase(),
        date,
        direction,
        tripId,
        ...(passengerUid && passengerUid !== user?.uid ? { passengerUid } : {}),
      });
      onAdded?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add flight");
    } finally {
      setLoading(false);
    }
  }

  const title = preselectedGuest
    ? `Add ${preselectedDirection ?? "flight"} for ${preselectedGuest.displayName}`
    : "Add flight";

  return (
    <Modal title={title} onClose={onClose}>
      {/* Direction toggle — locked when preselectedDirection is set */}
      <div className="mb-4 flex rounded-lg border border-taupe-200 p-1 dark:border-taupe-600">
        {(["arrival", "departure"] as const).map((d) => (
          <button
            key={d}
            type="button"
            disabled={directionLocked}
            onClick={() => setDirection(d)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
              direction === d
                ? "bg-[var(--accent-9)] text-[var(--accent-contrast)]"
                : "text-taupe-500 hover:text-taupe-800 disabled:cursor-default dark:text-taupe-400 dark:hover:text-taupe-200"
            }`}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      {/* Existing flights picker */}
      {existingFlights.length > 0 && (
        <div className="mb-2">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-taupe-400 dark:text-taupe-500">
            Existing {direction}s
          </p>
          <ul className="space-y-1.5">
            {existingFlights.map((f) => {
              const time =
                direction === "arrival"
                  ? f.estimatedArrival ?? f.scheduledArrival
                  : f.estimatedDeparture ?? f.scheduledDeparture;
              const isAdding = addingExistingId === f.id;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    disabled={addingExistingId !== null}
                    onClick={() => handleAddToExisting(f)}
                    className="w-full flex items-center gap-3 rounded-lg border border-taupe-200 px-3 py-2.5 text-left text-sm transition hover:border-[var(--accent-9)] hover:bg-[var(--accent-1)] disabled:opacity-60 dark:border-taupe-600 dark:hover:border-[var(--accent-9)] dark:hover:bg-[var(--accent-2)]"
                  >
                    <span className="font-mono font-semibold flex-shrink-0">
                      {f.flightNumber}
                    </span>
                    <span className="text-xs text-taupe-500 dark:text-taupe-400 flex-shrink-0">
                      {fmtShort(time)}
                    </span>
                    {f.passengers.length > 0 && (
                      <span className="text-xs text-taupe-400 dark:text-taupe-500 truncate">
                        · {f.passengers.map((p) => p.displayName).join(", ")}
                      </span>
                    )}
                    {isAdding && (
                      <span className="ml-auto flex-shrink-0 text-xs text-[var(--accent-11)]">
                        Adding…
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-taupe-200 dark:border-taupe-600" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-taupe-400 dark:bg-taupe-800 dark:text-taupe-500">
                or add a new flight
              </span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Guest field — shown for host, locked when preselectedGuest is set */}
        {isHost && (
          <div>
            <label className="mb-1 block text-sm font-medium text-taupe-700 dark:text-taupe-300">
              Guest name
            </label>
            <TextField.Root
              value={guestName}
              onChange={(e) => handleGuestNameChange(e.target.value)}
              placeholder="e.g. Alex Smith"
              required
              disabled={guestLocked}
              className={guestLocked ? "opacity-60" : ""}
            />
            {!guestLocked && guests.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {guests.map((m) => (
                  <button
                    key={m.userUid}
                    type="button"
                    onClick={() => pickGuest(m)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                      selectedGuestUid === m.userUid
                        ? "border-[var(--accent-9)] bg-[var(--accent-2)] text-[var(--accent-11)]"
                        : "border-taupe-300 text-taupe-600 hover:border-[var(--accent-9)] hover:text-[var(--accent-11)] dark:border-taupe-600 dark:text-taupe-400"
                    }`}
                  >
                    {m.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-taupe-700 dark:text-taupe-300">
            Flight number
          </label>
          <TextField.Root
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
            placeholder="e.g. UA2341"
            required
            className="font-mono"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-taupe-700 dark:text-taupe-300">
            Date
          </label>
          <TextField.Root
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" color="gray" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Searching…" : "Add new"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
