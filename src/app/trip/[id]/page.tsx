"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@radix-ui/themes";
import { GearIcon } from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useTripDetail, useTripMembers, useTravelTime, useSavedAddresses } from "@/hooks/queries";
import { qk } from "@/lib/queryClient";
import { db } from "@/lib/firebase";
import type { FlightWithPassengers } from "@/types";
import { GuestRoster } from "@/components/GuestRoster";
import { InviteModal } from "@/components/InviteModal";
import { AtAGlance } from "@/components/AtAGlance";

type ExtendedFlight = FlightWithPassengers & { directionsUrl: string };

export default function TripPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;
  const queryClient = useQueryClient();

  const [showInvite, setShowInvite] = useState(false);
  const [originOverride, setOriginOverride] = useState<{
    lat: number; lng: number; address: string;
  } | null>(null);

  // Guest Firestore snapshot for non-hosts (no travel time data needed)
  const [guestFlights, setGuestFlights] = useState<ExtendedFlight[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  const { data: trip, isLoading: tripLoading } = useTripDetail(tripId);
  const { data: members = [], isLoading: membersLoading } = useTripMembers(tripId);

  const isHost = !!trip && trip.hostUid === user?.uid;

  const {
    data: hostFlights = [],
    isFetching: travelTimeFetching,
    refetch: refetchTravelTime,
  } = useTravelTime(tripId, isHost, originOverride);

  const { data: savedAddresses = [] } = useSavedAddresses();

  // Real-time Firestore listener for guests
  useEffect(() => {
    if (!user || isHost) return;
    const q = query(collection(db, "flights"), where("tripId", "==", tripId));
    const unsub = onSnapshot(q, (snap) => {
      setGuestFlights(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExtendedFlight)));
    });
    return unsub;
  }, [user, tripId, isHost]);

  const flights = isHost ? hostFlights : guestFlights;

  function handleOriginChange(
    latLng: { lat: number; lng: number } | null,
    address: string | null
  ) {
    setOriginOverride(latLng && address ? { lat: latLng.lat, lng: latLng.lng, address } : null);
  }

  function handleChanged() {
    queryClient.invalidateQueries({ queryKey: qk.members(tripId) });
    queryClient.invalidateQueries({ queryKey: qk.traveltime(tripId, originOverride) });
  }

  if (loading || tripLoading) {
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
          onRefresh={() => refetchTravelTime()}
          refreshing={travelTimeFetching}
        />
      )}

      <GuestRoster
        flights={flights}
        members={members}
        membersLoading={membersLoading}
        isHost={isHost}
        currentUserUid={user!.uid}
        tripId={tripId}
        onChanged={handleChanged}
        onInvite={() => setShowInvite(true)}
      />

      {showInvite && (
        <InviteModal tripId={tripId} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}
