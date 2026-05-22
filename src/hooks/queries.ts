import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { qk } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type {
  Trip,
  FlightWithPassengers,
  GuestMergedNotification,
  SavedAddress,
} from "@/types";
import type { TripMember } from "@/components/GuestRoster";

type ExtendedFlight = FlightWithPassengers & { directionsUrl: string };

// ─── Trips list ──────────────────────────────────────────────────────────────

export function useTrips() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.trips(),
    queryFn: () => api.get<{ trips: Trip[] }>("/api/trips").then((r) => r.trips),
    enabled: !!user,
    staleTime: 2 * 60_000,
  });
}

// ─── Single trip ─────────────────────────────────────────────────────────────

export function useTripDetail(tripId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.trip(tripId),
    queryFn: () =>
      api.get<{ trip: Trip }>(`/api/trips/${tripId}`).then((r) => r.trip),
    enabled: !!user && !!tripId,
    staleTime: 5 * 60_000,
  });
}

// ─── Trip members ─────────────────────────────────────────────────────────────

export function useTripMembers(tripId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.members(tripId),
    queryFn: () =>
      api
        .get<{ members: TripMember[] }>(`/api/trips/${tripId}/members`)
        .then((r) => r.members),
    enabled: !!user && !!tripId,
    staleTime: 60_000,
  });
}

// ─── Travel times (host only) ─────────────────────────────────────────────────

interface TravelTimeOrigin {
  lat: number;
  lng: number;
  address: string;
}

export function useTravelTime(
  tripId: string,
  isHost: boolean,
  origin?: TravelTimeOrigin | null
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.traveltime(tripId, origin),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (origin) {
        qs.set("fromLat", String(origin.lat));
        qs.set("fromLng", String(origin.lng));
        qs.set("fromAddress", origin.address);
      }
      const url = `/api/trips/${tripId}/traveltime${qs.size ? `?${qs}` : ""}`;
      return api.get<{ flights: ExtendedFlight[] }>(url).then((r) => r.flights);
    },
    enabled: !!user && !!tripId && isHost,
    staleTime: 30_000,
    // Maps API is expensive — don't silently refetch on tab focus
    refetchOnWindowFocus: false,
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.notifications(),
    queryFn: () =>
      api
        .get<{ notifications: GuestMergedNotification[] }>("/api/notifications")
        .then((r) => r.notifications ?? []),
    enabled: !!user,
    staleTime: 2 * 60_000,
  });
}

// ─── Saved addresses ──────────────────────────────────────────────────────────

export function useSavedAddresses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.addresses(),
    queryFn: () =>
      api
        .get<{ addresses: SavedAddress[] }>("/api/addresses")
        .then((r) => r.addresses),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}
