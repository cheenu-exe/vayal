import { describe, expect, it } from "vitest";
import type { Booking, MachineListing } from "../client/src/prototype/types";
import {
  getRentalDates,
  getRentalEndDate,
  hasRentalConflict,
  isMachineAvailableForDate,
  isMachineAvailableForRental,
  isValidDateInput,
} from "../client/src/prototype/bookingRules";

const baseMachine = {
  id: "machine-1",
  enabled: true,
  verificationStatus: "verified",
  availabilityStart: "2026-11-01",
  availabilityEnd: "2026-11-30",
  unavailableDates: ["2026-11-12"],
} as unknown as MachineListing;

function booking(
  id: string,
  status: Booking["status"],
  date = "2026-11-15",
  time = "07:00",
  duration = 4,
  durationUnit: "hours" | "days" = "hours",
  machineId = "machine-1"
): Booking {
  return { id, machineId, status, requestedDate: date, preferredTime: time, duration, durationUnit } as Booking;
}

describe("prototype booking rules", () => {
  it("accepts real calendar dates and rejects impossible or malformed dates", () => {
    expect(isValidDateInput("2028-02-29")).toBe(true);
    expect(isValidDateInput("2027-02-29")).toBe(false);
    expect(isValidDateInput("2026-13-01")).toBe(false);
    expect(isValidDateInput("15-11-2026")).toBe(false);
  });

  it("requires an enabled, verified machine and a date inside its service window", () => {
    expect(isMachineAvailableForDate(baseMachine, "2026-11-15", "2026-11-07")).toBe(true);
    expect(isMachineAvailableForDate({ ...baseMachine, enabled: false }, "2026-11-15", "2026-11-07")).toBe(false);
    expect(isMachineAvailableForDate({ ...baseMachine, verificationStatus: "submitted" } as MachineListing, "2026-11-15", "2026-11-07")).toBe(false);
    expect(isMachineAvailableForDate(baseMachine, "2026-10-31", "2026-10-01")).toBe(false);
    expect(isMachineAvailableForDate(baseMachine, "2026-12-01", "2026-11-07")).toBe(false);
    expect(isMachineAvailableForDate(baseMachine, "2026-11-12", "2026-11-07")).toBe(false);
    expect(isMachineAvailableForDate(baseMachine, "2026-11-06", "2026-11-07")).toBe(false);
  });

  it("calculates full date spans for multi-day and overnight rentals", () => {
    expect(getRentalEndDate("2026-11-15", "07:00", 1, "days")).toBe("2026-11-16");
    expect(getRentalEndDate("2026-11-15", "07:00", 3, "days")).toBe("2026-11-18");
    expect(getRentalEndDate("2026-11-15", "23:00", 3, "hours")).toBe("2026-11-16");
    expect(getRentalDates("2026-11-15", "23:00", 3, "hours")).toEqual(["2026-11-15", "2026-11-16"]);
  });

  it("rejects rentals that extend beyond the service window or across blocked dates", () => {
    const shortWindow = { ...baseMachine, availabilityEnd: "2026-11-16", unavailableDates: [] } as MachineListing;
    expect(isMachineAvailableForRental(shortWindow, "2026-11-15", "07:00", 1, "days", "2026-11-07")).toBe(true);
    expect(isMachineAvailableForRental(shortWindow, "2026-11-15", "07:00", 2, "days", "2026-11-07")).toBe(false);
    expect(isMachineAvailableForRental(baseMachine, "2026-11-11", "07:00", 2, "days", "2026-11-07")).toBe(false);
  });

  it("treats accepted and later rentals as conflicts only when time intervals overlap", () => {
    expect(hasRentalConflict([booking("a", "pending")], "machine-1", "2026-11-15", "07:00", 4, "hours")).toBe(false);
    expect(hasRentalConflict([booking("a", "accepted")], "machine-1", "2026-11-15", "08:00", 1, "hours")).toBe(true);
    expect(hasRentalConflict([booking("a", "confirmed")], "machine-1", "2026-11-15", "10:00", 1, "hours")).toBe(false);
    expect(hasRentalConflict([booking("a", "on_site_verified")], "machine-1", "2026-11-15", "07:30", 1, "hours")).toBe(true);
    expect(hasRentalConflict([booking("a", "completed")], "machine-1", "2026-11-15", "07:30", 1, "hours")).toBe(true);
  });

  it("blocks a candidate that overlaps any part of a multi-day or overnight booking", () => {
    expect(hasRentalConflict([booking("a", "accepted", "2026-11-15", "07:00", 3, "days")], "machine-1", "2026-11-17", "08:00", 2, "hours")).toBe(true);
    expect(hasRentalConflict([booking("a", "accepted", "2026-11-15", "23:00", 3, "hours")], "machine-1", "2026-11-16", "01:00", 1, "hours")).toBe(true);
    expect(hasRentalConflict([booking("a", "accepted", "2026-11-15", "07:00", 3, "days")], "machine-1", "2026-11-18", "07:00", 1, "hours")).toBe(false);
  });

  it("ignores the booking being accepted and does not conflict across machines", () => {
    expect(hasRentalConflict([booking("a", "accepted")], "machine-1", "2026-11-15", "07:00", 4, "hours", "a")).toBe(false);
    expect(hasRentalConflict([booking("a", "accepted")], "machine-2", "2026-11-15", "07:00", 4, "hours")).toBe(false);
  });
});
