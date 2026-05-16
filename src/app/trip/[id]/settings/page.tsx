"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";
import type { Trip, Membership, SavedAddress } from "@/types";

interface MemberRow {
  userUid: string;
  role: string;
  displayName: string;
  photoURL: string | null;
}

export default function TripSettingsPage() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Edit fields
  const [name, setName] = useState("");
  const [airport, setAirport] = useState("");
  const [baseAddress, setBaseAddress] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("current");

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  async function load() {
    const [{ trip }, { members }, { addresses }] = await Promise.all([
      api.get<{ trip: Trip }>(`/api/trips/${tripId}`),
      api.get<{ members: MemberRow[] }>(`/api/trips/${tripId}/members`),
      api.get<{ addresses: SavedAddress[] }>("/api/addresses"),
    ]);
    setTrip(trip);
    setName(trip.name);
    setAirport(trip.airport);
    setBaseAddress(trip.baseAddress);
    setMembers(members);
    setSavedAddresses(addresses);
    setFetching(false);
  }

  useEffect(() => {
    if (user) load();
  }, [user, tripId]);

  // Verify caller is host after load
  const isHost = members.find((m) => m.userUid === user?.uid)?.role === "host";

  useEffect(() => {
    if (!fetching && !isHost) router.replace(`/trip/${tripId}`);
  }, [fetching, isHost, router, tripId]);

  function handleAddressSelect(id: string) {
    setSelectedAddressId(id);
    if (id === "current") return;
    const addr = savedAddresses.find((a) => a.id === id);
    if (addr) setBaseAddress(addr.address);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.patch(`/api/trips/${tripId}`, {
        name,
        airport: airport.trim().toUpperCase(),
        baseAddress,
      });
      router.push(`/trip/${tripId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTrip() {
    if (!confirm(`Delete "${trip?.name}"? This cannot be undone.`)) return;
    await api.delete(`/api/trips/${tripId}`);
    router.replace("/dashboard");
  }

  async function handleRemoveMember(uid: string, displayName: string) {
    if (!confirm(`Remove ${displayName} from this trip?`)) return;
    // DELETE with a body — fetch directly since api.delete doesn't take a body
    const token = await getIdToken();
    await fetch(`/api/trips/${tripId}/members`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userUid: uid }),
    });
    load();
  }

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!trip) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/dashboard" className="hover:text-gray-700">Trips</Link>
        <span>›</span>
        <Link href={`/trip/${tripId}`} className="hover:text-gray-700">{trip.name}</Link>
        <span>›</span>
        <span>Settings</span>
      </div>

      <h1 className="mb-6 text-2xl font-bold">Trip settings</h1>

      {/* Edit form */}
      <form onSubmit={handleSave} className="mb-8 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-700">Details</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Airport (IATA)</label>
          <input
            type="text"
            value={airport}
            onChange={(e) => setAirport(e.target.value.toUpperCase())}
            maxLength={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Trip base</label>

          {savedAddresses.length > 0 && (
            <select
              value={selectedAddressId}
              onChange={(e) => handleAddressSelect(e.target.value)}
              className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="current">Keep current</option>
              {savedAddresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}{a.isDefault ? " (default)" : ""}
                </option>
              ))}
              <option value="new">Enter a new address…</option>
            </select>
          )}

          {(selectedAddressId === "new" || savedAddresses.length === 0) && (
            <input
              type="text"
              value={baseAddress}
              onChange={(e) => setBaseAddress(e.target.value)}
              placeholder="Full address"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          )}

          {selectedAddressId === "current" && savedAddresses.length > 0 && (
            <p className="mt-1 truncate text-xs text-gray-400">{trip.baseAddress}</p>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      {/* Members */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-gray-700">Guests</h2>
        {members.filter((m) => m.role === "guest").length === 0 ? (
          <p className="text-sm text-gray-400">No guests yet.</p>
        ) : (
          <ul className="space-y-2">
            {members
              .filter((m) => m.role === "guest")
              .map((m) => (
                <li key={m.userUid} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {m.photoURL && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.photoURL}
                        alt={m.displayName}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    )}
                    <span className="text-sm">{m.displayName}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(m.userUid, m.displayName)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-white p-5">
        <h2 className="mb-2 font-semibold text-red-700">Danger zone</h2>
        <p className="mb-3 text-sm text-gray-500">
          Permanently deletes this trip and all guest data. Cannot be undone.
        </p>
        <button
          onClick={handleDeleteTrip}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          Delete trip
        </button>
      </div>
    </div>
  );
}
