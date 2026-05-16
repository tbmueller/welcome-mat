"use client";

import { useState } from "react";
import { api } from "@/lib/apiClient";

interface Props {
  tripId: string;
  onClose: () => void;
  onAdded?: () => void;
}

export function AddFlightModal({ tripId, onClose, onAdded }: Props) {
  const [flightNumber, setFlightNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [direction, setDirection] = useState<"arrival" | "departure">("arrival");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/flights", {
        flightNumber: flightNumber.trim().toUpperCase(),
        date,
        direction,
        tripId,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Add flight</h2>

        {/* Arrival / Departure toggle */}
        <div className="mb-4 flex rounded-lg border border-gray-200 p-1">
          {(["arrival", "departure"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
                direction === d
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Flight number
            </label>
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
              placeholder="e.g. UA2341"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Searching…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
