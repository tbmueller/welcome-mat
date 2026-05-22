"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Checkbox, TextField, IconButton } from "@radix-ui/themes";
import { ArrowLeftIcon, TrashIcon } from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSavedAddresses } from "@/hooks/queries";
import { qk } from "@/lib/queryClient";
import { api } from "@/lib/apiClient";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: addresses = [], isLoading: addressesLoading } = useSavedAddresses();

  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/api/addresses", { label: newLabel, address: newAddress, makeDefault });
      setShowAdd(false);
      setNewLabel("");
      setNewAddress("");
      setMakeDefault(false);
      queryClient.invalidateQueries({ queryKey: qk.addresses() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(id: string) {
    await api.patch(`/api/addresses/${id}`, { makeDefault: true });
    queryClient.invalidateQueries({ queryKey: qk.addresses() });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    await api.delete(`/api/addresses/${id}`);
    queryClient.invalidateQueries({ queryKey: qk.addresses() });
  }

  if (loading || addressesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-9)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <IconButton asChild variant="ghost" color="gray" size="2">
          <Link href="/dashboard" aria-label="Back to trips">
            <ArrowLeftIcon width="18" height="18" />
          </Link>
        </IconButton>
        <div className="flex items-center gap-2 text-sm text-taupe-400 dark:text-taupe-500">
          <Link href="/dashboard" className="hover:text-taupe-700 dark:hover:text-taupe-300">Trips</Link>
          <span>›</span>
          <span>Profile</span>
        </div>
      </div>

      <h1 className="mb-6 text-2xl font-bold">Saved Addresses</h1>

      <ul className="mb-4 space-y-3">
        {addresses.map((addr) => (
          <li key={addr.id} className="flex items-start justify-between gap-4 rounded-xl border border-taupe-200 bg-white p-4 shadow-sm dark:border-taupe-700 dark:bg-taupe-800">
            <div className="min-w-0">
              <p className="font-medium">
                {addr.label}
                {addr.isDefault && (
                  <span className="ml-2 rounded-full bg-[var(--accent-3)] px-2 py-0.5 text-xs text-[var(--accent-11)]">
                    Default
                  </span>
                )}
              </p>
              <p className="truncate text-sm text-taupe-500 dark:text-taupe-400">{addr.address}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {!addr.isDefault && (
                <Button variant="ghost" size="1" onClick={() => handleSetDefault(addr.id)}>
                  Set default
                </Button>
              )}
              <Button variant="ghost" color="red" size="1" onClick={() => handleDelete(addr.id)}>
                <TrashIcon width={14} height={14} /> Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {showAdd ? (
        <form onSubmit={handleAdd} className="rounded-xl border border-taupe-200 bg-white p-4 shadow-sm space-y-3 dark:border-taupe-700 dark:bg-taupe-800">
          <TextField.Root
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Home, Airbnb SF)"
            required
          />
          <TextField.Root
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Full address"
            required
          />
          <label className="flex items-center gap-2 text-sm text-taupe-600 dark:text-taupe-300">
            <Checkbox checked={makeDefault} onCheckedChange={(v) => setMakeDefault(!!v)} />
            Make this my default
          </label>
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" color="gray" onClick={() => setShowAdd(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full rounded-lg border-2 border-dashed border-taupe-300 py-3 text-sm text-taupe-500 transition hover:border-[var(--accent-9)] hover:text-[var(--accent-11)] dark:border-taupe-600 dark:text-taupe-400"
        >
          + Add address
        </button>
      )}
    </div>
  );
}
