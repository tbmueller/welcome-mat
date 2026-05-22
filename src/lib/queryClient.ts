import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,       // 1 min default
      gcTime: 5 * 60_000,      // keep in memory 5 min after unmount
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

/** Centralised query key factory — use these everywhere to ensure invalidation hits the right caches. */
export const qk = {
  trips:         () => ["trips"] as const,
  trip:          (id: string) => ["trips", id] as const,
  members:       (tripId: string) => ["trips", tripId, "members"] as const,
  traveltime:    (
    tripId: string,
    origin?: { lat: number; lng: number; address: string } | null
  ) => ["trips", tripId, "traveltime", origin ?? null] as const,
  notifications: () => ["notifications"] as const,
  addresses:     () => ["addresses"] as const,
};
