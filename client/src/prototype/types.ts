export type Role = "farmer" | "owner";

export type MachineCategory =
  | "Tractors"
  | "Harvesters"
  | "Rotavators"
  | "Cultivators"
  | "Seed Drills"
  | "Ploughs"
  | "Sprayers"
  | "Other agricultural equipment";

export type VerificationStatus =
  | "not_submitted"
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected"
  | "additional_documents_required";

export type BookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "confirmed"
  | "on_site_verified"
  | "completed"
  | "cancelled";

export interface Profile {
  id: string;
  role: Role;
  phone: string;
  name: string;
  district: string;
  town: string;
  village: string;
  pinCode: string;
  createdAt: string;
}

export interface MachineListing {
  id: string;
  ownerPhone: string;
  ownerName: string;
  name: string;
  category: MachineCategory;
  manufacturer: string;
  model: string;
  year: number;
  serialNumber: string;
  capacity: string;
  specifications: string;
  condition: string;
  fuelType: string;
  description: string;
  photos: string[];
  documents: string[];
  hourlyRate: number;
  dailyRate: number;
  hasOperator: boolean;
  operatorName: string;
  district: string;
  town: string;
  village: string;
  pinCode: string;
  operatingArea: string;
  transportCharge: number;
  availabilityStart: string;
  availabilityEnd: string;
  unavailableDates: string[];
  verificationStatus: VerificationStatus;
  verificationReason: string;
  enabled: boolean;
  isDemo: boolean;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export interface FarmLocation {
  village: string;
  town: string;
  district: string;
  pinCode: string;
}

export interface Booking {
  id: string;
  farmerPhone: string;
  farmerName: string;
  ownerPhone: string;
  ownerName: string;
  machineId: string;
  machineName: string;
  machinePhoto: string;
  requestedDate: string;
  preferredTime: string;
  duration: number;
  durationUnit: "hours" | "days";
  farmLocation: FarmLocation;
  instructions: string;
  estimatedAmount: number;
  status: BookingStatus;
  bookingOtp: string;
  farmerPresent: boolean;
  operatorPresent: boolean;
  ownerResponse: string;
  createdAt: string;
}

export interface PrototypeState {
  version: 1;
  profiles: Profile[];
  machines: MachineListing[];
  bookings: Booking[];
  session: { role: Role; phone: string } | null;
}

export interface NewBookingInput {
  machineId: string;
  requestedDate: string;
  preferredTime: string;
  duration: number;
  durationUnit: "hours" | "days";
  farmLocation: FarmLocation;
  instructions: string;
}

export type MachineDraft = Omit<MachineListing,
  | "id"
  | "ownerPhone"
  | "ownerName"
  | "verificationStatus"
  | "verificationReason"
  | "enabled"
  | "isDemo"
  | "distanceKm"
  | "rating"
  | "reviewCount"
  | "createdAt"
>;
