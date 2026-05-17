export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  defaultAddressId: string | null;
}

export interface SavedAddress {
  id: string;
  userUid: string;
  label: string;
  address: string;
  latLng: { lat: number; lng: number };
  isDefault: boolean;
  createdAt: string;
}

export interface Trip {
  id: string;
  hostUid: string;
  name: string;
  airport: string; // IATA code
  createdAt: string;
  active: boolean;
  baseAddress: string;
  baseLatLng: { lat: number; lng: number };
}

export type MemberRole = "host" | "guest";

export interface Membership {
  id: string; // {tripId}_{uid}
  tripId: string;
  userUid: string;
  role: MemberRole;
  displayName: string;
  photoURL: string | null;
  isManual?: boolean;
}

export interface GuestMergedNotification {
  id: string;
  type: "guest_merged";
  hostUid: string;
  tripId: string;
  tripName: string;
  manualDisplayName: string;
  realDisplayName: string;
  realPhotoURL: string | null;
  createdAt: string;
  read: boolean;
}

export interface Invite {
  id: string;
  tripId: string;
  token: string;
  email: string | null;
  usedByUid: string | null;
  active: boolean;
  createdAt: string;
  expiresAt: string;
}

export type FlightDirection = "arrival" | "departure";
export type FlightStatus =
  | "pending"
  | "scheduled"
  | "departed"
  | "en_route"
  | "landed"
  | "arrived"
  | "cancelled"
  | "diverted"
  | "unknown";

export interface Flight {
  id: string;
  tripId: string;
  flightNumber: string;
  airline: string;
  date: string; // YYYY-MM-DD
  direction: FlightDirection;

  scheduledDeparture: string | null;
  estimatedDeparture: string | null;
  departureAirport: string | null;
  departureTerminal: string | null;
  departureGate: string | null;

  scheduledArrival: string | null;
  estimatedArrival: string | null;
  arrivalAirport: string | null;
  arrivalTerminal: string | null;
  arrivalGate: string | null;

  status: FlightStatus;
  lastPolled: string | null;
}

export interface Passenger {
  id: string; // {flightId}_{uid}
  flightId: string;
  tripId: string;
  userUid: string;
  displayName: string;
  photoURL: string | null;
}

// Derived type used in host dashboard
export interface FlightWithPassengers extends Flight {
  passengers: Passenger[];
  leaveBy: string | null; // ISO timestamp
  travelMinutes: number | null;
}
