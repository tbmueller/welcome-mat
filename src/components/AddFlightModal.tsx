"use client";

import { useState } from "react";
import { Button, TextField } from "@radix-ui/themes";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { Modal } from "@/components/Modal";

interface Member {
  userUid: string;
  displayName: string;
}

interface Props {
  tripId: string;
  isHost?: boolean;
  members?: Member[];
  onClose: () => void;
  onAdded?: () => void;
}

export function AddFlightModal({ tripId, isHost, members = [], onClose, onAdded }: Props) {
  const { user } = useAuth();
  const [flightNumber, setFlightNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [direction, setDirection] = useState<"arrival" | "departure">("arrival");
  const [guestName, setGuestName] = useState("");
  const [selectedGuestUid, setSelectedGuestUid] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const guests = members.filter((m) => m.userUid !== user?.uid);

  function pickGuest(m: Member) {
    setGuestName(m.displayName);
    setSelectedGuestUid(m.userUid);
  }

  function handleGuestNameChange(name: string) {
    setGuestName(name);
    setSelectedGuestUid(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let passengerUid: string | undefined;
      if (isHost) {
        if (selectedGuestUid) {
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

  return (
    <Modal title="Add flight" onClose={onClose}>
      {/* Arrival / Departure toggle */}
      <div className="mb-4 flex rounded-lg border border-taupe-200 p-1 dark:border-taupe-600">
        {(["arrival", "departure"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
              direction === d
                ? "bg-[var(--accent-9)] text-[var(--accent-contrast)]"
                : "text-taupe-500 hover:text-taupe-800 dark:text-taupe-400 dark:hover:text-taupe-200"
            }`}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            />
            {guests.length > 0 && (
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
            {loading ? "Searching…" : "Add"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
