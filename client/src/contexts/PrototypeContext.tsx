import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { makeDemoState } from "@/prototype/seed";
import type { Booking, BookingStatus, MachineDraft, MachineListing, NewBookingInput, Profile, PrototypeState, Role, VerificationStatus } from "@/prototype/types";

const STORAGE_KEY = "vayal-prototype-state-v1";

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

function createBookingId() {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `VY-${suffix}`;
}

function makeOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
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
    if (!machine) return null;
    const rate = input.durationUnit === "hours" ? machine.hourlyRate : machine.dailyRate;
    const booking: Booking = {
      id: createBookingId(), farmerPhone: currentUser.phone, farmerName: currentUser.name, ownerPhone: machine.ownerPhone, ownerName: machine.ownerName,
      machineId: machine.id, machineName: machine.name, machinePhoto: machine.photos[0], requestedDate: input.requestedDate, preferredTime: input.preferredTime,
      duration: input.duration, durationUnit: input.durationUnit, farmLocation: input.farmLocation, instructions: input.instructions,
      estimatedAmount: rate * input.duration + machine.transportCharge, status: "pending", bookingOtp: "", farmerPresent: false, operatorPresent: false,
      ownerResponse: "", createdAt: new Date().toISOString(),
    };
    setState(previous => ({ ...previous, bookings: [booking, ...previous.bookings] }));
    return booking.id;
  }, [currentUser, state.machines]);

  const changeBookingStatus = useCallback((id: string, status: BookingStatus, response = "") => {
    if (!currentUser) return;
    setState(previous => ({
      ...previous,
      bookings: previous.bookings.map(booking => {
        if (booking.id !== id) return booking;
        const isOwner = currentUser.role === "owner" && booking.ownerPhone === currentUser.phone;
        const isFarmer = currentUser.role === "farmer" && booking.farmerPhone === currentUser.phone;
        const ownerAction = isOwner && ((status === "accepted" || status === "rejected") && booking.status === "pending");
        const farmerAction = isFarmer && ((status === "confirmed" && booking.status === "accepted") || (status === "cancelled" && ["pending", "accepted", "confirmed"].includes(booking.status)));
        const ownerCompletion = isOwner && status === "completed" && booking.status === "on_site_verified";
        if (!ownerAction && !farmerAction && !ownerCompletion) return booking;
        const nextOtp = status === "accepted" ? makeOtp() : booking.bookingOtp;
        return { ...booking, status, bookingOtp: nextOtp, ownerResponse: response || booking.ownerResponse };
      }),
    }));
  }, [currentUser]);

  const confirmFarmerPresence = useCallback((id: string) => {
    if (!currentUser || currentUser.role !== "farmer") return;
    setState(previous => ({
      ...previous,
      bookings: previous.bookings.map(booking => booking.id === id && booking.farmerPhone === currentUser.phone && booking.status === "confirmed" ? { ...booking, farmerPresent: true } : booking),
    }));
  }, [currentUser]);

  const verifyOnSite = useCallback((id: string, enteredOtp: string) => {
    if (!currentUser || currentUser.role !== "owner") return false;
    const booking = state.bookings.find(item => item.id === id && item.ownerPhone === currentUser.phone && item.status === "confirmed");
    if (!booking || !booking.farmerPresent || !booking.bookingOtp || enteredOtp.trim() !== booking.bookingOtp) return false;
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
      machines: previous.machines.map(machine => machine.id === id && machine.ownerPhone === currentUser.phone ? { ...machine, ...patch } : machine),
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
    confirmFarmerPresence, verifyOnSite, completeRental, createMachine, updateMachine, changeVerification, toggleMachine, resetPrototype,
  };

  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const context = useContext(PrototypeContext);
  if (!context) throw new Error("usePrototype must be used inside PrototypeProvider");
  return context;
}
