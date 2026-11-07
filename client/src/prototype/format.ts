import type { BookingStatus, VerificationStatus } from "./types";

export const categories = [
  "Tractors", "Harvesters", "Rotavators", "Cultivators", "Seed Drills", "Ploughs", "Sprayers", "Other agricultural equipment",
] as const;

export function formatRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", options).format(date);
}

export function bookingStatusLabel(status: BookingStatus) {
  const labels: Record<BookingStatus, string> = {
    pending: "Pending", accepted: "Accepted", rejected: "Rejected", confirmed: "Confirmed",
    on_site_verified: "On-Site Verified", completed: "Completed", cancelled: "Cancelled",
  };
  return labels[status];
}

export function verificationStatusLabel(status: VerificationStatus) {
  const labels: Record<VerificationStatus, string> = {
    not_submitted: "Not Submitted", submitted: "Submitted", under_review: "Under Review", verified: "Verified",
    rejected: "Rejected", additional_documents_required: "Additional Documents Required",
  };
  return labels[status];
}

export function statusClass(status: string) {
  return `status-pill status-${status.replaceAll("_", "-")}`;
}

export function toDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function todayInputValue() {
  return toDateInputValue(new Date());
}

export function isDateBlocked(date: string, unavailableDates: string[]) {
  return unavailableDates.includes(date);
}
