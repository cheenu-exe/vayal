import { todayInputValue } from "./format";
import type { Booking, BookingStatus, MachineListing } from "./types";

const RENTAL_BLOCKING_STATUSES: BookingStatus[] = ["accepted", "confirmed", "on_site_verified", "completed"];
const DAY_MS = 24 * 60 * 60 * 1000;

function rentalWindow(startDate: string, startTime: string, duration: number, durationUnit: "hours" | "days") {
  if (!isValidDateInput(startDate) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return null;
  if (!Number.isInteger(duration) || duration < 1 || duration > 30) return null;
  if (durationUnit !== "hours" && durationUnit !== "days") return null;

  const [year, month, day] = startDate.split("-").map(Number);
  const [hours, minutes] = startTime.split(":").map(Number);
  const start = Date.UTC(year, month - 1, day, hours, minutes);
  const endExclusive = start + duration * (durationUnit === "hours" ? 60 * 60 * 1000 : DAY_MS);
  return {
    start,
    endExclusive,
    endDate: new Date(endExclusive - 1).toISOString().slice(0, 10),
  };
}

function addCalendarDays(date: string, offset: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
}

export function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function getRentalEndDate(
  startDate: string,
  startTime: string,
  duration: number,
  durationUnit: "hours" | "days"
) {
  return rentalWindow(startDate, startTime, duration, durationUnit)?.endDate ?? null;
}

export function getRentalDates(
  startDate: string,
  startTime: string,
  duration: number,
  durationUnit: "hours" | "days"
) {
  const window = rentalWindow(startDate, startTime, duration, durationUnit);
  if (!window) return [];
  const dates: string[] = [];
  for (let date = startDate; date <= window.endDate; date = addCalendarDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

export function isMachineAvailableForRental(
  machine: MachineListing | undefined,
  startDate: string,
  startTime: string,
  duration: number,
  durationUnit: "hours" | "days",
  today = todayInputValue()
) {
  const window = rentalWindow(startDate, startTime, duration, durationUnit);
  if (!machine || !window) return false;
  if (!machine.enabled || machine.verificationStatus !== "verified") return false;
  if (startDate < today || startDate < machine.availabilityStart || window.endDate > machine.availabilityEnd) return false;
  return getRentalDates(startDate, startTime, duration, durationUnit)
    .every(date => !machine.unavailableDates.includes(date));
}

export function isMachineAvailableForDate(
  machine: MachineListing | undefined,
  date: string,
  today = todayInputValue()
) {
  return isMachineAvailableForRental(machine, date, "00:00", 1, "hours", today);
}

function existingBookingWindow(booking: Booking) {
  const validWindow = rentalWindow(booking.requestedDate, booking.preferredTime, booking.duration, booking.durationUnit);
  if (validWindow) return validWindow;

  // Older/corrupt prototype records conservatively block their entire requested calendar day.
  if (!isValidDateInput(booking.requestedDate)) return null;
  const [year, month, day] = booking.requestedDate.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day);
  return { start, endExclusive: start + DAY_MS, endDate: booking.requestedDate };
}

export function hasRentalConflict(
  bookings: Booking[],
  machineId: string,
  startDate: string,
  startTime: string,
  duration: number,
  durationUnit: "hours" | "days",
  ignoreId?: string
) {
  const candidate = rentalWindow(startDate, startTime, duration, durationUnit);
  if (!candidate) return true;

  return bookings.some(booking => {
    if (
      booking.id === ignoreId ||
      booking.machineId !== machineId ||
      !RENTAL_BLOCKING_STATUSES.includes(booking.status)
    ) return false;

    const existing = existingBookingWindow(booking);
    return Boolean(existing && candidate.start < existing.endExclusive && existing.start < candidate.endExclusive);
  });
}
