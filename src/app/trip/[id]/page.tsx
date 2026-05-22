"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@radix-ui/themes";
import { GearIcon } from "@radix-ui/react-icons";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type { Trip, FlightWithPassengers, SavedAddress } from "@/types";
import { GuestRoster, type TripMember } from "@/components/GuestRoster";
import { InviteModal } from "@/components/InviteModal";
import { AtAGlance } from "@/components/AtAGlance";

type ExtendedFlight = FlightWithPassengers & { directionsUrl: string };

export default function TripPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [flights, setFlights] = useState<ExtendedFlight[]>([]);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Optional origin override for travel time (null = use trip default)
  const [originOverride, setOriginOverride] = useState<{
    latLng: { lat: number; lng: number };
    address: string;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<{ trip: Trip }>(`/api/trips/${tripId}`).then(({ trip }) => {
      setTrip(trip);
      setFetching(false);
    });
  }, [user, tripId]);

  const isHost = !!trip && trip.hostUid === user?.uid;

  const refreshMembers = useCallback(async () => {
    setMembersLoading(true);
    await api
      .get<{ members: TripMember[] }>(`/api/trips/${tripId}/members`)
      .then(({ members }) => setMembers(members))
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }, [tripId]);

  // Fetch all members (guests + host) for all roles — guests also need the list
  useEffect(() => {
    if (!trip) return;
    refreshMembers();
  }, [trip, refreshMembers]);

  useEffect(() => {
    if (!isHost) return;
    api
      .get<{ addresses: SavedAddress[] }>("/api/addresses")
      .then(({ addresses }) => setSavedAddresses(addresses))
      .catch(() => {});
  }, [isHost]);

  const refreshTravelTimes = useCallback(async (origin?: { latLng: { lat: number; lng: number }; address: string } | null) => {
    if (!isHost) return;
    setRefreshing(true);
    try {
      const qs = new URLSearchParams();
      const o = origin !== undefined ? origin : originOverride;
      if (o) {
        qs.set("fromLat", String(o.latLng.lat));
        qs.set("fromLng", String(o.latLng.lng));
        qs.set("fromAddress", o.address);
      }
      const url = `/api/trips/${tripId}/traveltime${qs.size ? `?${qs}` : ""}`;
      const data = await api.get<{ flights: ExtendedFlight[] }>(url);
      setFlights(data.flights);
    } finally {
      setRefreshing(false);
    }
  }, [isHost, tripId, originOverride]);

  useEffect(() => {
    if (!isHost) return;
    refreshTravelTimes();
  }, [isHost, refreshTravelTimes]);

  // Real-time listener on flights for this trip
  useEffect(() => {
    if (!user || isHost) return;
    const q = query(collection(db, "flights"), where("tripId", "==", tripId));
    const unsub = onSnapshot(q, (snap) => {
      setFlights(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExtendedFlight)));
    });
    return unsub;
  }, [user, tripId, isHost]);

  function handleOriginChange(latLng: { lat: number; lng: number } | null, address: string | null) {
    const next = latLng && address ? { latLng, address } : null;
    setOriginOverride(next);
    refreshTravelTimes(next);
  }

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-9)] border-t-transparent" />
      </div>
    );
  }

  if (!trip) return <p className="p-8 text-center text-taupe-400 dark:text-taupe-500">Trip not found.</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-2 flex items-center gap-2 text-sm text-taupe-400 dark:text-taupe-500">
        <Link href="/dashboard" className="hover:text-taupe-700 dark:hover:text-taupe-300">
          Trips
        </Link>
        <span>›</span>
        <span>{trip.name}</span>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{trip.name}</h1>
          <p className="text-sm text-taupe-500 dark:text-taupe-400">{trip.airport}</p>
          <p className="mt-1 text-xs text-taupe-400 dark:text-taupe-500">{trip.baseAddress}</p>
        </div>
        {isHost && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowInvite(true)}>Invite guests</Button>
            <Button asChild variant="outline" color="gray">
              <Link href={`/trip/${tripId}/settings`}>
                <GearIcon />
                Trip settings
              </Link>
            </Button>
          </div>
        )}
      </div>

      {isHost && flights.length > 0 && (
        <AtAGlance
          flights={flights}
          trip={trip}
          savedAddresses={savedAddresses}
          onOriginChange={handleOriginChange}
          onRefresh={() => refreshTravelTimes()}
          refreshing={refreshing}
        />
      )}

      <GuestRoster
        flights={flights}
        members={members}
        membersLoading={membersLoading}
        isHost={isHost}
        currentUserUid={user!.uid}
        tripId={tripId}
        onChanged={() => { refreshMembers(); refreshTravelTimes(); }}
        onInvite={() => setShowInvite(true)}
      />

      {showInvite && (
        <InviteModal tripId={tripId} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}
