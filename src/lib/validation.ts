import { z } from "zod";

export const FLIGHT_NUMBER_REGEX = /^[A-Z0-9]{2}\d{1,4}[A-Z]?$/;
export const IATA_CODE_REGEX = /^[A-Z]{3}$/;

export const FlightNumberSchema = z
  .string()
  .transform((v) => v.trim().toUpperCase().replace(/\s/g, ""))
  .pipe(z.string().regex(FLIGHT_NUMBER_REGEX, "Invalid flight number").max(8));

export const IataCodeSchema = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .pipe(z.string().regex(IATA_CODE_REGEX, "Invalid airport code"));

export const AddFlightSchema = z.object({
  flightNumber: FlightNumberSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  direction: z.enum(["arrival", "departure"]),
  tripId: z.string().min(1).max(50),
  passengerUid: z.string().optional(),
});

export const CreateTripSchema = z.object({
  name: z.string().min(1).max(80),
  airport: IataCodeSchema,
  baseAddress: z.string().min(1).max(300),
  savedAddressId: z.string().optional(),
  saveAddress: z.boolean().optional(),
  saveAddressLabel: z.string().max(50).optional(),
  makeDefault: z.boolean().optional(),
});

export const SavedAddressSchema = z.object({
  label: z.string().min(1).max(50),
  address: z.string().min(1).max(300),
});

export const AddManualGuestSchema = z.object({
  displayName: z.string().min(1).max(80),
});

export const CreateInviteSchema = z.object({
  tripId: z.string().min(1).max(50),
  email: z.string().email().optional(),
  maxUses: z.number().int().min(1).max(500).optional(),
});
