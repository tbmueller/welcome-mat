"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import type { SavedAddress } from "@/types";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { IataAutocomplete } from "@/components/IataAutocomplete";

interface Props {
  onClose: () => void;
  onCreated: (tripId: string) => void;
}

export function CreateTripModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [airport, setAirport] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  const [baseAddress, setBaseAddress] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<{ addresses: SavedAddress[] }>("/api/addresses").then(({ addresses }) => {
      setSavedAddresses(addresses);
      const def = addresses.find((a) => a.isDefault);
      if (def) {
        setSelectedAddressId(def.id);
        setBaseAddress(def.address);
      }
    });
  }, []);

  function handleAddressSelect(id: string) {
    setSelectedAddressId(id);
    if (id === "new") {
      setBaseAddress("");
    } else {
      const addr = savedAddresses.find((a) => a.id === id);
      if (addr) setBaseAddress(addr.address);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ id: string }>("/api/trips", {
        name,
        airport: airport.trim().toUpperCase(),
        baseAddress,
        savedAddressId: selectedAddressId !== "new" ? selectedAddressId : undefined,
        saveAddress: selectedAddressId === "new" ? saveAddress : false,
        saveAddressLabel: saveAddress ? saveLabel : undefined,
        makeDefault: saveAddress ? makeDefault : false,
      });
      onCreated(res.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create trip");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-taupe-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-700 dark:border-taupe-600 dark:bg-taupe-700 dark:text-taupe-100 dark:placeholder-taupe-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-taupe-800">
        <h2 className="mb-4 text-lg font-semibold">New trip</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-taupe-700 dark:text-taupe-300">
              Trip name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer visit"
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-taupe-700 dark:text-taupe-300">
              Airport (IATA code)
            </label>
            <IataAutocomplete
              value={airport}
              onChange={setAirport}
              className={`${inputCls} font-mono uppercase`}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-taupe-700 dark:text-taupe-300">
              Trip base
            </label>

            {savedAddresses.length > 0 && (
              <select
                value={selectedAddressId}
                onChange={(e) => handleAddressSelect(e.target.value)}
                className={`mb-2 ${inputCls}`}
              >
                {savedAddresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}{a.isDefault ? " (default)" : ""}
                  </option>
                ))}
                <option value="new">Enter a new address…</option>
              </select>
            )}

            {selectedAddressId === "new" && (
              <>
                <AddressAutocomplete
                  value={baseAddress}
                  onChange={setBaseAddress}
                  onSelect={setBaseAddress}
                  placeholder="Full address"
                  required
                  className={inputCls}
                />

                <label className="mt-2 flex items-center gap-2 text-sm text-taupe-600 dark:text-taupe-300">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="rounded"
                  />
                  Save this address
                </label>

                {saveAddress && (
                  <div className="mt-2 space-y-2 pl-5">
                    <input
                      type="text"
                      value={saveLabel}
                      onChange={(e) => setSaveLabel(e.target.value)}
                      placeholder="Label (e.g. Home, Airbnb SF)"
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
                  </div>
                )}
              </>
            )}
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
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
