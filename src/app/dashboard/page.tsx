"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";
import type { Trip } from "@/types";
import { CreateTripModal } from "@/components/CreateTripModal";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<{ trips: Trip[] }>("/api/trips").then((r) => {
      setTrips(r.trips);
      setFetching(false);
    });
  }, [user]);

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Trips</h1>
        <div className="flex items-center gap-3">
          <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-800">
            Profile
          </Link>
          <button
            onClick={signOut}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Sign out
          </button>
        </div>
      </div>

      <button
        onClick={() => setShowCreate(true)}
        className="mb-6 w-full rounded-lg border-2 border-dashed border-gray-300 py-4 text-sm text-gray-500 transition hover:border-blue-400 hover:text-blue-600"
      >
        + New trip
      </button>

      {trips.length === 0 ? (
        <p className="text-center text-sm text-gray-400">No trips yet.</p>
      ) : (
        <ul className="space-y-3">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/trip/${trip.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{trip.name}</p>
                    <p className="text-sm text-gray-500">{trip.airport}</p>
                  </div>
                  <span className="text-gray-400">›</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateTripModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            router.push(`/trip/${id}`);
          }}
        />
      )}
    </div>
  );
}
