"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";
import { db } from "@/lib/firebase";
import { doc, collection, query, where, onSnapshot } from "firebase/firestore";
import type { Trip, Membership, FlightWithPassengers } from "@/types";
import { FlightCard } from "@/components/FlightCard";
import { AddFlightModal } from "@/components/AddFlightModal";
import { InviteModal } from "@/components/InviteModal";

type ExtendedFlight = FlightWithPassengers & { directionsUrl: string };

export default function TripPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [flights, setFlights] = useState<ExtendedFlight[]>([]);
  const [showAddFlight, setShowAddFlight] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<{ trip: Trip }>(`/api/trips/${tripId}`),
    ]).then(([{ trip }]) => {
      setTrip(trip);
      setFetching(false);
    });
  }, [user, tripId]);

  // Real-time listener on the user's membership doc for this trip
  useEffect(() => {
    if (!user) return;
    const membershipId = `${tripId}_${user.uid}`;
    const unsub = onSnapshot(
      doc(db, "memberships", membershipId),
      (snap) => {
        if (snap.exists()) setMembership({ id: snap.id, ...snap.data() } as Membership);
      }
    );
    return unsub;
  }, [user, tripId]);

  const isHost = membership?.role === "host";

  const refreshTravelTimes = useCallback(async () => {
    if (!isHost) return;
    const data = await api.get<{ flights: ExtendedFlight[] }>(
      `/api/trips/${tripId}/traveltime`
    );
    setFlights(data.flights);
  }, [isHost, tripId]);

  useEffect(() => {
    if (!isHost) return;
    refreshTravelTimes();
  }, [isHost, refreshTravelTimes]);

  // Real-time listener on flights for this trip
  useEffect(() => {
    if (!user || isHost) return; // host uses traveltime endpoint
    const q = query(collection(db, "flights"), where("tripId", "==", tripId));
    const unsub = onSnapshot(q, (snap) => {
      setFlights(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExtendedFlight))
      );
    });
    return unsub;
  }, [user, tripId, isHost]);

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!trip) return <p className="p-8 text-center text-gray-400">Trip not found.</p>;

  const arrivals = flights.filter((f) => f.direction === "arrival");
  const departures = flights.filter((f) => f.direction === "departure");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/dashboard" className="hover:text-gray-700">
          Trips
        </Link>
        <span>›</span>
        <span>{trip.name}</span>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{trip.name}</h1>
          <p className="text-sm text-gray-500">{trip.airport}</p>
          <p className="mt-1 text-xs text-gray-400">{trip.baseAddress}</p>
        </div>
        {isHost && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInvite(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Invite guests
            </button>
            <Link
              href={`/trip/${tripId}/settings`}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Settings
            </Link>
          </div>
        )}
      </div>

      {isHost && (
        <button
          onClick={refreshTravelTimes}
          className="mb-4 text-xs text-blue-600 hover:underline"
        >
          Refresh travel times
        </button>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Arrivals
        </h2>
        {arrivals.length === 0 ? (
          <p className="text-sm text-gray-400">No arrivals yet.</p>
        ) : (
          <ul className="space-y-3">
            {arrivals
              .sort((a, b) =>
                (a.estimatedArrival ?? a.scheduledArrival ?? "").localeCompare(
                  b.estimatedArrival ?? b.scheduledArrival ?? ""
                )
              )
              .map((f) => (
                <FlightCard
                  key={f.id}
                  flight={f}
                  isHost={isHost}
                  currentUserUid={user!.uid}
                  onRemoved={refreshTravelTimes}
                />
              ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Departures
        </h2>
        {departures.length === 0 ? (
          <p className="text-sm text-gray-400">No departures yet.</p>
        ) : (
          <ul className="space-y-3">
            {departures
              .sort((a, b) =>
                (a.estimatedDeparture ?? a.scheduledDeparture ?? "").localeCompare(
                  b.estimatedDeparture ?? b.scheduledDeparture ?? ""
                )
              )
              .map((f) => (
                <FlightCard
                  key={f.id}
                  flight={f}
                  isHost={isHost}
                  currentUserUid={user!.uid}
                  onRemoved={refreshTravelTimes}
                />
              ))}
          </ul>
        )}
      </section>

      <button
        onClick={() => setShowAddFlight(true)}
        className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 transition hover:border-blue-400 hover:text-blue-600"
      >
        + Add my flight
      </button>

      {showAddFlight && (
        <AddFlightModal
          tripId={tripId}
          onClose={() => setShowAddFlight(false)}
          onAdded={refreshTravelTimes}
        />
      )}

      {showInvite && (
        <InviteModal tripId={tripId} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}
