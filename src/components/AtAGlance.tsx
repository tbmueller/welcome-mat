"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Button, Checkbox, Select, TextField } from "@radix-ui/themes";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { qk } from "@/lib/queryClient";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import type { FlightWithPassengers, SavedAddress } from "@/types";

type ExtendedFlight = FlightWithPassengers & { directionsUrl?: string };

interface Origin {
  id: string;
  label: string;
  address: string;
  latLng: { lat: number; lng: number } | null;
}

interface Props {
  flights: ExtendedFlight[];
  trip: { baseAddress: string; baseLatLng: { lat: number; lng: number } };
  savedAddresses: SavedAddress[];
  onOriginChange: (latLng: { lat: number; lng: number } | null, address: string | null) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "now";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(parseISO(iso), "h:mm a");
}

const inputCls = "w-full rounded-lg border border-taupe-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)] dark:border-taupe-600 dark:bg-taupe-700 dark:text-taupe-100 dark:placeholder-taupe-400";

export function AtAGlance({ flights, trip, savedAddresses, onOriginChange, onRefresh, refreshing }: Props) {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [selectedOriginId, setSelectedOriginId] = useState("trip");

  // "Add address" inline form state
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const matchingSaved = savedAddresses.find((a) => a.address === trip.baseAddress);

  const origins: Origin[] = [
    {
      id: "trip",
      label: matchingSaved ? matchingSaved.label : "Trip base",
      address: trip.baseAddress,
      latLng: trip.baseLatLng,
    },
    ...savedAddresses
      .filter((a) => a.address !== trip.baseAddress)
      .map((a) => ({ id: a.id, label: a.label, address: a.address, latLng: a.latLng })),
  ];

  function handleOriginChange(id: string) {
    setSelectedOriginId(id);
    setSaveError("");
    if (id === "new") return; // inline form handles its own submit
    const origin = origins.find((o) => o.id === id);
    if (!origin) return;
    if (id === "trip") {
      onOriginChange(null, null);
    } else {
      onOriginChange(origin.latLng, origin.address);
    }
  }

  function handleCancelNew() {
    setSelectedOriginId("trip");
    setNewAddress("");
    setNewLabel("");
    setMakeDefault(false);
    setSaveError("");
  }

  async function handleSaveNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newAddress.trim() || !newLabel.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await api.post<{
        id: string;
        label: string;
        address: string;
        latLng: { lat: number; lng: number };
        isDefault: boolean;
      }>("/api/addresses", { label: newLabel.trim(), address: newAddress.trim(), makeDefault });

      // Immediately use the new address as the origin (coords come back in response)
      onOriginChange(res.latLng, res.address);
      setSelectedOriginId(res.id);

      // Update the dropdown so the new address appears without a page reload
      queryClient.invalidateQueries({ queryKey: qk.addresses() });

      // Reset form
      setNewAddress("");
      setNewLabel("");
      setMakeDefault(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setSaving(false);
    }
  }

  const upcoming = flights
    .filter((f) => f.status !== "arrived" && f.status !== "cancelled")
    .map((f) => {
      const relevantTime =
        f.direction === "arrival"
          ? f.estimatedArrival ?? f.scheduledArrival
          : f.estimatedDeparture ?? f.scheduledDeparture;
      const ms = relevantTime ? new Date(relevantTime).getTime() - now : null;
      const isDelayed =
        f.direction === "arrival"
          ? !!(f.estimatedArrival && f.scheduledArrival && new Date(f.estimatedArrival) > new Date(f.scheduledArrival))
          : !!(f.estimatedDeparture && f.scheduledDeparture && new Date(f.estimatedDeparture) > new Date(f.scheduledDeparture));
      return { flight: f, relevantTime, ms, isDelayed };
    })
    .filter((x) => x.ms === null || x.ms > -60 * 60_000)
    .sort((a, b) => {
      if (!a.relevantTime) return 1;
      if (!b.relevantTime) return -1;
      return new Date(a.relevantTime).getTime() - new Date(b.relevantTime).getTime();
    });

  const delayedCount = upcoming.filter((x) => x.isDelayed).length;

  if (upcoming.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-[var(--accent-6)] bg-[var(--accent-2)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--accent-12)]">At a glance</h2>
        <Button variant="ghost" size="1" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--accent-11)] whitespace-nowrap">Departing from</span>
          <Select.Root value={selectedOriginId} onValueChange={handleOriginChange}>
            <Select.Trigger className="min-w-0 flex-1" />
            <Select.Content>
              {origins.map((o) => (
                <Select.Item key={o.id} value={o.id}>{o.label}</Select.Item>
              ))}
              <Select.Separator />
              <Select.Item value="new">+ Add address…</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        {selectedOriginId === "new" && (
          <form
            onSubmit={handleSaveNew}
            className="rounded-lg border border-taupe-200 bg-white p-3 space-y-2 shadow-sm dark:border-taupe-700 dark:bg-taupe-800"
          >
            <AddressAutocomplete
              value={newAddress}
              onChange={setNewAddress}
              onSelect={setNewAddress}
              placeholder="Full address"
              required
              className={inputCls}
            />
            <TextField.Root
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (e.g. Hotel, Mom's house)"
              required
            />
            <label className="flex items-center gap-2 text-sm text-taupe-600 dark:text-taupe-300">
              <Checkbox checked={makeDefault} onCheckedChange={(v) => setMakeDefault(!!v)} />
              Make this my default
            </label>
            {saveError && <p className="text-xs text-red-500 dark:text-red-400">{saveError}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" color="gray" size="1" onClick={handleCancelNew} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" size="1" disabled={saving || !newAddress.trim() || !newLabel.trim()} className="flex-1">
                {saving ? "Saving…" : "Save & use"}
              </Button>
            </div>
          </form>
        )}
      </div>

      {delayedCount > 0 && (
        <div className="mb-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          ⚠ {delayedCount} flight{delayedCount > 1 ? "s" : ""} delayed
        </div>
      )}

      <ul className="space-y-2">
        {upcoming.map(({ flight: f, ms, isDelayed }) => (
          <li key={f.id} className="flex flex-col gap-1 rounded-lg bg-white px-3 py-2.5 shadow-sm dark:bg-taupe-800">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-sm">{f.flightNumber}</span>
                <span className="rounded-full bg-taupe-100 px-2 py-0.5 text-xs text-taupe-600 dark:bg-taupe-700 dark:text-taupe-300">
                  {f.direction === "arrival" ? "Arrival" : "Departure"}
                </span>
                {isDelayed && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    Delayed
                  </span>
                )}
              </div>
              {ms !== null && (
                <span className={`text-xs font-medium tabular-nums ${ms < 0 ? "text-taupe-400 dark:text-taupe-500" : "text-[var(--accent-11)]"}`}>
                  {ms < 0 ? `${formatCountdown(-ms)} ago` : `in ${formatCountdown(ms)}`}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-taupe-500 dark:text-taupe-400">
                {f.leaveBy ? (
                  <>
                    <span>Leave by <span className="font-semibold text-taupe-800 dark:text-taupe-100">{fmt(f.leaveBy)}</span></span>
                    {f.travelMinutes && <span className="text-taupe-400 dark:text-taupe-500">· {f.travelMinutes} min drive</span>}
                  </>
                ) : (
                  <span className="text-taupe-400 dark:text-taupe-500">Travel time unavailable</span>
                )}
              </div>
              {f.directionsUrl && (
                <a href={f.directionsUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[var(--accent-11)] hover:underline">
                  Directions ↗
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
