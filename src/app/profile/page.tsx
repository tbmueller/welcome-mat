"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";
import type { SavedAddress } from "@/types";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  function loadAddresses() {
    api.get<{ addresses: SavedAddress[] }>("/api/addresses").then(({ addresses }) => {
      setAddresses(addresses);
      setFetching(false);
    });
  }

  useEffect(() => {
    if (user) loadAddresses();
  }, [user]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/api/addresses", {
        label: newLabel,
        address: newAddress,
        makeDefault,
      });
      setShowAdd(false);
      setNewLabel("");
      setNewAddress("");
      setMakeDefault(false);
      loadAddresses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(id: string) {
    await api.patch(`/api/addresses/${id}`, { makeDefault: true });
    loadAddresses();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    await api.delete(`/api/addresses/${id}`);
    loadAddresses();
  }

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/dashboard" className="hover:text-gray-700">
          Trips
        </Link>
        <span>›</span>
        <span>Profile</span>
      </div>

      <h1 className="mb-6 text-2xl font-bold">Saved Addresses</h1>

      <ul className="mb-4 space-y-3">
        {addresses.map((addr) => (
          <li
            key={addr.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {addr.label}
                {addr.isDefault && (
                  <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    Default
                  </span>
                )}
              </p>
              <p className="truncate text-sm text-gray-500">{addr.address}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {!addr.isDefault && (
                <button
                  onClick={() => handleSetDefault(addr.id)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Set default
                </button>
              )}
              <button
                onClick={() => handleDelete(addr.id)}
                className="text-xs text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showAdd ? (
        <form onSubmit={handleAdd} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Home, Airbnb SF)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Full address"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
              className="rounded"
            />
            Make this my default
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 transition hover:border-blue-400 hover:text-blue-600"
        >
          + Add address
        </button>
      )}
    </div>
  );
}
