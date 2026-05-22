"use client";

import { useEffect, useState } from "react";
import { Button, Checkbox, Select, TextField } from "@radix-ui/themes";
import { api } from "@/lib/apiClient";
import { useSavedAddresses } from "@/hooks/queries";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { IataAutocomplete } from "@/components/IataAutocomplete";
import { Modal } from "@/components/Modal";

interface Props {
  onClose: () => void;
  onCreated: (tripId: string) => void;
}

export function CreateTripModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [airport, setAirport] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  const [baseAddress, setBaseAddress] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: savedAddresses = [] } = useSavedAddresses();

  // Pre-select the default address once addresses load
  useEffect(() => {
    if (savedAddresses.length > 0 && selectedAddressId === "new") {
      const def = savedAddresses.find((a) => a.isDefault);
      if (def) {
        setSelectedAddressId(def.id);
        setBaseAddress(def.address);
      }
    }
  }, [savedAddresses]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const inputCls = "w-full rounded-lg border border-taupe-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)] dark:border-taupe-600 dark:bg-taupe-700 dark:text-taupe-100 dark:placeholder-taupe-400";

  return (
    <Modal title="New trip" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-taupe-700 dark:text-taupe-300">
            Trip name
          </label>
          <TextField.Root
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Summer visit"
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
            <Select.Root value={selectedAddressId} onValueChange={handleAddressSelect}>
              <Select.Trigger className="mb-2 w-full" />
              <Select.Content>
                {savedAddresses.map((a) => (
                  <Select.Item key={a.id} value={a.id}>
                    {a.label}{a.isDefault ? " (default)" : ""}
                  </Select.Item>
                ))}
                <Select.Item value="new">Enter a new address…</Select.Item>
              </Select.Content>
            </Select.Root>
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
                <Checkbox checked={saveAddress} onCheckedChange={(v) => setSaveAddress(!!v)} />
                Save this address
              </label>

              {saveAddress && (
                <div className="mt-2 space-y-2 pl-5">
                  <TextField.Root
                    value={saveLabel}
                    onChange={(e) => setSaveLabel(e.target.value)}
                    placeholder="Label (e.g. Home, Airbnb SF)"
                    required
                  />
                  <label className="flex items-center gap-2 text-sm text-taupe-600 dark:text-taupe-300">
                    <Checkbox checked={makeDefault} onCheckedChange={(v) => setMakeDefault(!!v)} />
                    Make this my default
                  </label>
                </div>
              )}
            </>
          )}
        </div>

        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" color="gray" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
