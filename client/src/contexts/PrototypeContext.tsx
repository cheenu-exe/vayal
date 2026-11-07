import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { makeDemoState } from "@/prototype/seed";
import type { Booking, BookingStatus, MachineDraft, MachineListing, NewBookingInput, Profile, PrototypeState, Role, VerificationStatus } from "@/prototype/types";

const STORAGE_KEY = "vayal-prototype-state-v1";
const RENTAL_BLOCKING_STATUSES: BookingStatus[] = ["accepted", "confirmed", "on_site_verified", "completed"];

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function hasRentalConflict(bookings: Booking[], machineId: string, date: string, ignoreId?: string) {
  return bookings.some(booking =>
    booking.id !== ignoreId &&
    booking.machineId === machineId &&
    booking.requestedDate === date &&
    RENTAL_BLOCKING_STATUSES.includes(booking.status)
  );
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return local.length === 10 ? `+91${local}` : "";
}

function readState(): PrototypeState {
  if (typeof window === "undefined") return makeDemoState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeDemoState();
    const parsed = JSON.parse(raw) as PrototypeState;
    if (parsed.version !== 1 || !Array.isArray(parsed.profiles) || !Array.isArray(parsed.machines) || !Array.isArray(parsed.bookings)) return makeDemoState();
    return parsed;
  } catch {
    return makeDemoState();
  }
}

function randomInteger(min: number, max: number) {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return min + (value[0] % (max - min + 1));
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}

function createBookingId(bookings: Booking[]) {
  let id = "";
  do {
    const suffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Date.now().toString(36) + "-" + randomInteger(1000, 999999).toString(36);
    id = "VY-" + suffix.toUpperCase();
  } while (bookings.some(booking => booking.id === id));
  return id;
}

function makeOtp() {
  return String(randomInteger(100000, 999999));
}

interface PrototypeContextValue {
  state: PrototypeState;
  currentUser: Profile | null;
  findProfile: (role: Role, phone: string) => Profile | undefined;
  beginSession: (role: Role, phone: string) => boolean;
  completeRegistration: (input: Omit<Profile, "id" | "createdAt">) => void;
  signOut: () => void;
  updateProfile: (patch: Partial<Pick<Profile, "name" | "district" | "town" | "village" | "pinCode">>) => void;
  createBooking: (input: NewBookingInput) => string | null;
  changeBookingStatus: (id: string, status: BookingStatus, response?: string) => void;
  confirmFarmerPresence: (id: string) => void;
  confirmOperatorArrival: (id: string) => void;
  verifyOnSite: (id: string, enteredOtp: string) => boolean;
  completeRental: (id: string) => void;
  createMachine: (draft: MachineDraft) => string | null;
  updateMachine: (id: string, patch: Partial<MachineDraft>) => void;
  changeVerification: (id: string, status: VerificationStatus, reason?: string) => void;
  toggleMachine: (id: string) => void;
  resetPrototype: () => void;
}

const PrototypeContext = createContext<PrototypeContextValue | null>(null);

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PrototypeState>(readState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Prototype state stays available for this session if browser storage is full or disabled.
    }
  }, [state]);

  const currentUser = useMemo(() => {
    if (!state.session) return null;
    return state.profiles.find(profile => profile.role === state.session?.role && profile.phone === state.session.phone) ?? null;
  }, [state.profiles, state.session]);

  const findProfile = useCallback((role: Role, phone: string) =>
    state.profiles.find(profile => profile.role === role && profile.phone === phone), [state.profiles]);

  const beginSession = useCallback((role: Role, phone: string) => {
    const exists = state.profiles.some(profile => profile.role === role && profile.phone === phone);
    if (exists) setState(previous => ({ ...previous, session: { role, phone } }));
    return exists;
  }, [state.profiles]);

  const completeRegistration = useCallback((input: Omit<Profile, "id" | "createdAt">) => {
    const profile: Profile = { ...input, id: `${input.role}-${Date.now()}`, createdAt: new Date().toISOString() };
    setState(previous => ({
      ...previous,
      profiles: [...previous.profiles.filter(item => !(item.role === input.role && item.phone === input.phone)), profile],
      session: { role: input.role, phone: input.phone },
    }));
  }, []);

  const signOut = useCallback(() => setState(previous => ({ ...previous, session: null })), []);

  const updateProfile = useCallback((patch: Partial<Pick<Profile, "name" | "district" | "town" | "village" | "pinCode">>) => {
    if (!state.session) return;
    setState(previous => ({
      ...previous,
      profiles: previous.profiles.map(profile => profile.role === state.session?.role && profile.phone === state.session.phone ? { ...profile, ...patch } : profile),
    }));
  }, [state.session]);

  const createBooking = useCallback((input: NewBookingInput) => {
    if (!currentUser || currentUser.role !== "farmer") return null;
    const machine = state.machines.find(item => item.id === input.machineId && item.enabled && item.verificationStatus === "verified");
    if (!machine || machine.ownerPhone === currentUser.phone) return null;
    if (!isValidDateInput(input.requestedDate) || input.requestedDate < todayInputValue()) return null;
    if (input.requestedDate < machine.availabilityStart || input.requestedDate > machine.availabilityEnd) return null;
    if (machine.unavailableDates.includes(input.requestedDate) || hasRentalConflict(state.bookings, machine.id, input.requestedDate)) return null;
    if (!Number.isInteger(input.duration) || input.duration < 1 || input.duration > 30) return null;
    if (input.durationUnit !== "hours" && input.durationUnit !== "days") return null;
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.preferredTime)) return null;
    const location = {
      village: input.farmLocation.village.trim(),
      town: input.farmLocation.town.trim(),
      district: input.farmLocation.district.trim(),
      pinCode: input.farmLocation.pinCode.trim(),
    };
    if (!location.village || !location.district || (location.pinCode && !/^\d{6}$/.test(location.pinCode))) return null;
    const rate = input.durationUnit === "hours" ? machine.hourlyRate : machine.dailyRate;
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(machine.transportCharge) || machine.transportCharge < 0) return null;
    const estimatedAmount = rate * input.duration + machine.transportCharge;
    if (!Number.isFinite(estimatedAmount)) return null;
    const booking: Booking = {
      id: createBookingId(state.bookings), farmerPhone: currentUser.phone, farmerName: currentUser.name, ownerPhone: machine.ownerPhone, ownerName: machine.ownerName,
      machineId: machine.id, machineName: machine.name, machinePhoto: machine.photos[0], requestedDate: input.requestedDate, preferredTime: input.preferredTime,
      duration: input.duration, durationUnit: input.durationUnit, farmLocation: location, instructions: input.instructions.trim().slice(0, 500),
      estimatedAmount, status: "pending", bookingOtp: "", farmerPresent: false, operatorPresent: false, operatorArrivalConfirmed: false,
      ownerResponse: "", createdAt: new Date().toISOString(),
    };
    setState(previous => ({ ...previous, bookings: [booking, ...previous.bookings] }));
    return booking.id;
  }, [currentUser, state.machines]);

  const changeBookingStatus = useCallback((id: string, status: BookingStatus, response = "") => {
    if (!currentUser) return;
    setState(previous => {
      const target = previous.bookings.find(booking => booking.id === id);
      if (!target) return previous;
      const isOwner = currentUser.role === "owner" && target.ownerPhone === currentUser.phone;
      const isFarmer = currentUser.role === "farmer" && target.farmerPhone === currentUser.phone;
      const ownerAction = isOwner && ((status === "accepted" || status === "rejected") && target.status === "pending");
      const farmerAction = isFarmer && ((status === "confirmed" && target.status === "accepted") || (status === "cancelled" && ["pending", "accepted", "confirmed"].includes(target.status)));
      const ownerCompletion = isOwner && status === "completed" && target.status === "on_site_verified";
      if (!ownerAction && !farmerAction && !ownerCompletion) return previous;

      if (ownerAction && status === "accepted" && hasRentalConflict(previous.bookings, target.machineId, target.requestedDate, target.id)) {
        return {
          ...previous,
          bookings: previous.bookings.map(booking => booking.id === id
            ? { ...booking, ownerResponse: "This machine already has another accepted demo rental on that date. Keep this request pending or reject it." }
            : booking),
        };
      }

      const nextOtp = status === "accepted" ? makeOtp() : target.bookingOtp;
      return {
        ...previous,
        bookings: previous.bookings.map(booking => booking.id === id
          ? { ...booking, status, bookingOtp: nextOtp, ownerResponse: response || booking.ownerResponse }
          : booking),
      };
    });
  }, [currentUser]);

  const confirmFarmerPresence = useCallback((id: string) => {
    if (!currentUser || currentUser.role !== "farmer") return;
    setState(previous => ({
      ...previous,
      bookings: previous.bookings.map(booking => booking.id === id && booking.farmerPhone === currentUser.phone && booking.status === "confirmed" ? { ...booking, farmerPresent: true } : booking),
    }));
  }, [currentUser]);

  const confirmOperatorArrival = useCallback((id: string) => {
    if (!currentUser || currentUser.role !== "owner") return;
    setState(previous => ({
      ...previous,
      bookings: previous.bookings.map(booking =>
        booking.id === id &&
        booking.ownerPhone === currentUser.phone &&
        booking.status === "confirmed" &&
        booking.farmerPresent
          ? { ...booking, operatorArrivalConfirmed: true }
          : booking
      ),
    }));
  }, [currentUser]);

  const verifyOnSite = useCallback((id: string, enteredOtp: string) => {
    if (!currentUser || currentUser.role !== "owner") return false;
    const booking = state.bookings.find(item => item.id === id && item.ownerPhone === currentUser.phone && item.status === "confirmed");
    if (!booking || !booking.farmerPresent || !booking.operatorArrivalConfirmed || !booking.bookingOtp || enteredOtp.trim() !== booking.bookingOtp) return false;
    setState(previous => ({
      ...previous,
      bookings: previous.bookings.map(item => item.id === id ? { ...item, status: "on_site_verified", operatorPresent: true } : item),
    }));
    return true;
  }, [currentUser, state.bookings]);

  const completeRental = useCallback((id: string) => changeBookingStatus(id, "completed"), [changeBookingStatus]);

  const createMachine = useCallback((draft: MachineDraft) => {
    if (!currentUser || currentUser.role !== "owner") return null;
    const machine: MachineListing = {
      ...draft,
      id: `m-${Date.now()}`,
      ownerPhone: currentUser.phone,
      ownerName: currentUser.name,
      verificationStatus: "submitted",
      verificationReason: "Submitted to simulated prototype review. No real reviewer receives these details.",
      enabled: false,
      isDemo: true,
      distanceKm: 10,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    };
    setState(previous => ({ ...previous, machines: [machine, ...previous.machines] }));
    return machine.id;
  }, [currentUser]);

  const updateMachine = useCallback((id: string, patch: Partial<MachineDraft>) => {
    if (!currentUser || currentUser.role !== "owner") return;
    setState(previous => ({
      ...previous,
      machines: previous.machines.map(machine => machine.id === id && machine.ownerPhone === currentUser.phone ? {
        ...machine,
        ...patch,
        verificationStatus: "submitted",
        verificationReason: "Machine details were edited. This listing has been returned to simulated review and must be marked Verified again.",
        enabled: false,
      } : machine),
    }));
  }, [currentUser]);

  const changeVerification = useCallback((id: string, status: VerificationStatus, reason = "") => {
    if (!currentUser || currentUser.role !== "owner") return;
    setState(previous => ({
      ...previous,
      machines: previous.machines.map(machine => machine.id === id && machine.ownerPhone === currentUser.phone ? {
        ...machine,
        verificationStatus: status,
        verificationReason: reason,
        enabled: status === "verified" ? (machine.verificationStatus === "verified" ? machine.enabled : true) : false,
      } : machine),
    }));
  }, [currentUser]);

  const toggleMachine = useCallback((id: string) => {
    if (!currentUser || currentUser.role !== "owner") return;
    setState(previous => ({
      ...previous,
      machines: previous.machines.map(machine => machine.id === id && machine.ownerPhone === currentUser.phone && machine.verificationStatus === "verified" ? { ...machine, enabled: !machine.enabled } : machine),
    }));
  }, [currentUser]);

  const resetPrototype = useCallback(() => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Ignore browser storage restrictions. */ }
    setState(makeDemoState());
  }, []);

  const value: PrototypeContextValue = {
    state, currentUser, findProfile, beginSession, completeRegistration, signOut, updateProfile, createBooking, changeBookingStatus,
    confirmFarmerPresence, confirmOperatorArrival, verifyOnSite, completeRental, createMachine, updateMachine, changeVerification, toggleMachine, resetPrototype,
  };

  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const context = useContext(PrototypeContext);
  if (!context) throw new Error("usePrototype must be used inside PrototypeProvider");
  return context;
}
