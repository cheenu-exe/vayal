import { describe, expect, it } from "vitest";
import type { Booking, MachineListing } from "../client/src/prototype/types";
import { hasRentalConflict, isMachineAvailableForDate, isValidDateInput } from "../client/src/prototype/bookingRules";

const baseMachine = {
  id: "machine-1",
  enabled: true,
  verificationStatus: "verified",
  availabilityStart: "2026-11-01",
  availabilityEnd: "2026-11-30",
  unavailableDates: ["2026-11-12"],
} as unknown as MachineListing;

function booking(id: string, status: Booking["status"], date = "2026-11-15"): Booking {
  return { id, machineId: "machine-1", status, requestedDate: date } as Booking;
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

  it("treats accepted and later rentals as date conflicts but ignores pending requests", () => {
    expect(hasRentalConflict([booking("a", "pending")], "machine-1", "2026-11-15")).toBe(false);
    expect(hasRentalConflict([booking("a", "accepted")], "machine-1", "2026-11-15")).toBe(true);
    expect(hasRentalConflict([booking("a", "confirmed")], "machine-1", "2026-11-15")).toBe(true);
    expect(hasRentalConflict([booking("a", "on_site_verified")], "machine-1", "2026-11-15")).toBe(true);
    expect(hasRentalConflict([booking("a", "completed")], "machine-1", "2026-11-15")).toBe(true);
  });

  it("ignores the booking being accepted and does not conflict across dates or machines", () => {
    expect(hasRentalConflict([booking("a", "accepted")], "machine-1", "2026-11-15", "a")).toBe(false);
    expect(hasRentalConflict([booking("a", "accepted", "2026-11-16")], "machine-1", "2026-11-15")).toBe(false);
    expect(hasRentalConflict([booking("a", "accepted")], "machine-2", "2026-11-15")).toBe(false);
  });
});
