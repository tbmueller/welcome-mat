"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import type { SavedAddress } from "@/types";

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">New trip</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Trip name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer visit"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Airport (IATA code)
            </label>
            <input
              type="text"
              value={airport}
              onChange={(e) => setAirport(e.target.value.toUpperCase())}
              placeholder="e.g. SFO"
              maxLength={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Trip base
            </label>

            {savedAddresses.length > 0 && (
              <select
                value={selectedAddressId}
                onChange={(e) => handleAddressSelect(e.target.value)}
                className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <input
                  type="text"
                  value={baseAddress}
                  onChange={(e) => setBaseAddress(e.target.value)}
                  placeholder="Full address"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />

                <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
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
                  </div>
                )}
              </>
            )}
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
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
