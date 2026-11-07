import { todayInputValue } from "./format";
import type { Booking, BookingStatus, MachineListing } from "./types";

const RENTAL_BLOCKING_STATUSES: BookingStatus[] = ["accepted", "confirmed", "on_site_verified", "completed"];

export function isValidDateInput(value: string) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isMachineAvailableForDate(
  machine: MachineListing | undefined,
  date: string,
  today = todayInputValue()
) {
  return Boolean(
    machine &&
    machine.enabled &&
    machine.verificationStatus === "verified" &&
    isValidDateInput(date) &&
    date >= today &&
    date >= machine.availabilityStart &&
    date <= machine.availabilityEnd &&
    !machine.unavailableDates.includes(date)
  );
}

export function hasRentalConflict(bookings: Booking[], machineId: string, date: string, ignoreId?: string) {
  return bookings.some(booking =>
    booking.id !== ignoreId &&
    booking.machineId === machineId &&
    booking.requestedDate === date &&
    RENTAL_BLOCKING_STATUSES.includes(booking.status)
  );
}
