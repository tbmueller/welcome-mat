"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";
import type { Trip, Membership, SavedAddress } from "@/types";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { IataAutocomplete } from "@/components/IataAutocomplete";
import { InviteModal } from "@/components/InviteModal";

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
  const [showInvite, setShowInvite] = useState(false);
  const [newGuestName, setNewGuestName] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);

  // Edit fields
  const [name, setName] = useState("");
  const [airport, setAirport] = useState("");
  const [baseAddress, setBaseAddress] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("current");

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  async function load() {
    try {
      const [{ trip }, { members }, addressResult] = await Promise.all([
        api.get<{ trip: Trip }>(`/api/trips/${tripId}`),
        api.get<{ members: MemberRow[] }>(`/api/trips/${tripId}/members`),
        api.get<{ addresses: SavedAddress[] }>("/api/addresses").catch(() => ({ addresses: [] as SavedAddress[] })),
      ]);
      setTrip(trip);
      setName(trip.name);
      setAirport(trip.airport);
      setBaseAddress(trip.baseAddress);
      setMembers(members);
      setSavedAddresses(addressResult.addresses);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load trip");
    } finally {
      setFetching(false);
    }
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
    try {
      await api.delete(`/api/trips/${tripId}`);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete trip");
    }
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

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!newGuestName.trim()) return;
    setAddingGuest(true);
    try {
      await api.post(`/api/trips/${tripId}/members`, { displayName: newGuestName.trim() });
      setNewGuestName("");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add guest");
    } finally {
      setAddingGuest(false);
    }
  }

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-800 border-t-transparent" />
      </div>
    );
  }

  if (!trip) return null;

  const inputCls = "w-full rounded-lg border border-taupe-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-700 dark:border-taupe-600 dark:bg-taupe-700 dark:text-taupe-100 dark:placeholder-taupe-400";

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-4 flex items-center gap-2 text-sm text-taupe-400 dark:text-taupe-500">
        <Link href="/dashboard" className="hover:text-taupe-700 dark:hover:text-taupe-300">Trips</Link>
        <span>›</span>
        <Link href={`/trip/${tripId}`} className="hover:text-taupe-700 dark:hover:text-taupe-300">{trip.name}</Link>
        <span>›</span>
        <span>Settings</span>
      </div>

      <h1 className="mb-6 text-2xl font-bold">Trip settings</h1>

      {/* Edit form */}
      <form onSubmit={handleSave} className="mb-8 space-y-4 rounded-xl border border-taupe-200 bg-white p-5 shadow-sm dark:border-taupe-700 dark:bg-taupe-800">
        <h2 className="font-semibold text-taupe-700 dark:text-taupe-300">Details</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-taupe-700 dark:text-taupe-300">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-taupe-700 dark:text-taupe-300">Airport (IATA)</label>
          <IataAutocomplete
            value={airport}
            onChange={setAirport}
            className={`${inputCls} font-mono uppercase`}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-taupe-700 dark:text-taupe-300">Trip base</label>

          {savedAddresses.length > 0 && (
            <select
              value={selectedAddressId}
              onChange={(e) => handleAddressSelect(e.target.value)}
              className={`mb-2 ${inputCls}`}
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
            <AddressAutocomplete
              value={baseAddress}
              onChange={setBaseAddress}
              onSelect={setBaseAddress}
              placeholder="Full address"
              required
              className={inputCls}
            />
          )}

          {selectedAddressId === "current" && savedAddresses.length > 0 && (
            <p className="mt-1 truncate text-xs text-taupe-400 dark:text-taupe-500">{trip.baseAddress}</p>
          )}
        </div>

        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-rose-800 py-2 text-sm font-medium text-white transition hover:bg-rose-900 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      {/* Members */}
      <div className="mb-8 rounded-xl border border-taupe-200 bg-white p-5 shadow-sm dark:border-taupe-700 dark:bg-taupe-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-taupe-700 dark:text-taupe-300">Guests</h2>
          <button
            onClick={() => setShowInvite(true)}
            className="text-xs font-medium text-rose-800 hover:underline dark:text-rose-600"
          >
            + Invite
          </button>
        </div>
        {members.filter((m) => m.role === "guest").length === 0 ? (
          <p className="text-sm text-taupe-400 dark:text-taupe-500">No guests yet.</p>
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
                    className="text-xs text-red-500 hover:underline dark:text-red-400"
                  >
                    Remove
                  </button>
                </li>
              ))}
          </ul>
        )}

        <form onSubmit={handleAddGuest} className="mt-4 flex gap-2">
          <input
            type="text"
            value={newGuestName}
            onChange={(e) => setNewGuestName(e.target.value)}
            placeholder="Add guest by name…"
            className="min-w-0 flex-1 rounded-lg border border-taupe-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-700 dark:border-taupe-600 dark:bg-taupe-700 dark:text-taupe-100 dark:placeholder-taupe-400"
          />
          <button
            type="submit"
            disabled={addingGuest || !newGuestName.trim()}
            className="rounded-lg bg-rose-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-900 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>

      {showInvite && (
        <InviteModal tripId={tripId} onClose={() => setShowInvite(false)} />
      )}

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-white p-5 dark:border-red-900 dark:bg-taupe-800">
        <h2 className="mb-2 font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
        <p className="mb-3 text-sm text-taupe-500 dark:text-taupe-400">
          Permanently deletes this trip and all guest data. Cannot be undone.
        </p>
        <button
          onClick={handleDeleteTrip}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
        >
          Delete trip
        </button>
      </div>
    </div>
  );
}
