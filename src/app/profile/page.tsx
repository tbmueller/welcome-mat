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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-900 border-t-transparent" />
      </div>
    );
  }

  const inputCls = "w-full rounded-lg border border-taupe-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-900 dark:border-taupe-600 dark:bg-taupe-700 dark:text-taupe-100 dark:placeholder-taupe-400";

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 flex items-center gap-2 text-sm text-taupe-400 dark:text-taupe-500">
        <Link href="/dashboard" className="hover:text-taupe-700 dark:hover:text-taupe-300">
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
            className="flex items-start justify-between gap-4 rounded-xl border border-taupe-200 bg-white p-4 shadow-sm dark:border-taupe-700 dark:bg-taupe-800"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {addr.label}
                {addr.isDefault && (
                  <span className="ml-2 rounded-full bg-pink-100 px-2 py-0.5 text-xs text-pink-900 dark:bg-pink-900 dark:text-pink-400">
                    Default
                  </span>
                )}
              </p>
              <p className="truncate text-sm text-taupe-500 dark:text-taupe-400">{addr.address}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {!addr.isDefault && (
                <button
                  onClick={() => handleSetDefault(addr.id)}
                  className="text-xs text-pink-900 hover:underline dark:text-pink-400"
                >
                  Set default
                </button>
              )}
              <button
                onClick={() => handleDelete(addr.id)}
                className="text-xs text-red-500 hover:underline dark:text-red-400"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showAdd ? (
        <form onSubmit={handleAdd} className="rounded-xl border border-taupe-200 bg-white p-4 shadow-sm space-y-3 dark:border-taupe-700 dark:bg-taupe-800">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Home, Airbnb SF)"
            className={inputCls}
            required
          />
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Full address"
            className={inputCls}
            required
          />
          <label className="flex items-center gap-2 text-sm text-taupe-600 dark:text-taupe-300">
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
              className="rounded"
            />
            Make this my default
          </label>
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="flex-1 rounded-lg border border-taupe-300 py-2 text-sm font-medium text-taupe-600 hover:bg-taupe-50 dark:border-taupe-600 dark:text-taupe-300 dark:hover:bg-taupe-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-pink-900 py-2 text-sm font-medium text-white hover:bg-pink-900 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full rounded-lg border-2 border-dashed border-taupe-300 py-3 text-sm text-taupe-500 transition hover:border-pink-400 hover:text-pink-900 dark:border-taupe-600 dark:text-taupe-400 dark:hover:border-pink-900 dark:hover:text-pink-400"
        >
          + Add address
        </button>
      )}
    </div>
  );
}
