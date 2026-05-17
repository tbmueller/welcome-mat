"use client";

import { useState } from "react";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

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

  // Host flow: type a name; clicking an existing guest chip fills the name and stores their uid
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
    // Clear the pinned uid if the host edits the name manually
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
          // Create a new manual guest on the fly
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

  const inputCls =
    "w-full rounded-lg border border-taupe-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-700 dark:border-taupe-600 dark:bg-taupe-700 dark:text-taupe-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-taupe-800">
        <h2 className="mb-4 text-lg font-semibold">Add flight</h2>

        {/* Arrival / Departure toggle */}
        <div className="mb-4 flex rounded-lg border border-taupe-200 p-1 dark:border-taupe-600">
          {(["arrival", "departure"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
                direction === d
                  ? "bg-rose-800 text-white"
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
              <input
                type="text"
                value={guestName}
                onChange={(e) => handleGuestNameChange(e.target.value)}
                placeholder="e.g. Alex Smith"
                className={`${inputCls} dark:placeholder-taupe-400`}
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
                          ? "border-rose-700 bg-rose-50 text-rose-900 dark:bg-rose-900/40 dark:text-rose-400"
                          : "border-taupe-300 text-taupe-600 hover:border-rose-600 hover:text-rose-800 dark:border-taupe-600 dark:text-taupe-400 dark:hover:border-rose-700 dark:hover:text-rose-600"
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
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
              placeholder="e.g. UA2341"
              className={`${inputCls} font-mono dark:placeholder-taupe-400`}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-taupe-700 dark:text-taupe-300">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-taupe-300 py-2 text-sm font-medium text-taupe-600 transition hover:bg-taupe-50 dark:border-taupe-600 dark:text-taupe-300 dark:hover:bg-taupe-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-rose-800 py-2 text-sm font-medium text-white transition hover:bg-rose-900 disabled:opacity-50"
            >
              {loading ? "Searching…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
