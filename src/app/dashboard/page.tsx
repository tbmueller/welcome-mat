"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@radix-ui/themes";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";
import type { Trip, GuestMergedNotification } from "@/types";
import { CreateTripModal } from "@/components/CreateTripModal";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [notifications, setNotifications] = useState<GuestMergedNotification[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<{ trips: Trip[] }>("/api/trips"),
      api.get<{ notifications: GuestMergedNotification[] }>("/api/notifications"),
    ]).then(([tripsRes, notifRes]) => {
      setTrips(tripsRes.trips);
      setNotifications(notifRes.notifications ?? []);
      setFetching(false);
    });
  }, [user]);

  function dismissNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    api.patch(`/api/notifications/${id}`, {});
  }

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-9)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {notifications.length > 0 && (
        <ul className="mb-6 space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--accent-6)] bg-[var(--accent-2)] px-4 py-3 text-sm">
              <p className="text-[var(--accent-12)]">
                <span className="font-semibold">{n.realDisplayName}</span> joined your trip{" "}
                <Link href={`/trip/${n.tripId}`} className="underline hover:no-underline">
                  {n.tripName}
                </Link>{" "}
                via invite and was matched to the manual guest you added as{" "}
                <span className="font-semibold">{n.manualDisplayName}</span>. Their flights have been transferred.
              </p>
              <Button variant="ghost" size="1" onClick={() => dismissNotification(n.id)} aria-label="Dismiss" className="mt-0.5 shrink-0">
                ✕
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Trips</h1>
      </div>

      <button
        onClick={() => setShowCreate(true)}
        className="mb-6 w-full rounded-lg border-2 border-dashed border-taupe-300 py-4 text-sm text-taupe-500 transition hover:border-[var(--accent-9)] hover:text-[var(--accent-11)] dark:border-taupe-600 dark:text-taupe-400"
      >
        + New trip
      </button>

      {trips.length === 0 ? (
        <p className="text-center text-sm text-taupe-400 dark:text-taupe-500">No trips yet.</p>
      ) : (
        <ul className="space-y-3">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/trip/${trip.id}`}
                className="block rounded-xl border border-taupe-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-taupe-700 dark:bg-taupe-800 dark:hover:border-taupe-600"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{trip.name}</p>
                    <p className="text-sm text-taupe-500 dark:text-taupe-400">{trip.airport}</p>
                  </div>
                  <span className="text-taupe-400 dark:text-taupe-500">›</span>
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
