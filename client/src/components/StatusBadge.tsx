import { bookingStatusLabel, statusClass, verificationStatusLabel } from "@/prototype/format";
import type { BookingStatus, VerificationStatus } from "@/prototype/types";

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <span className={statusClass(status)}>{bookingStatusLabel(status)}{status === "on_site_verified" && <small> · demo</small>}</span>;
}

export function VerificationBadge({ status, compact = false }: { status: VerificationStatus; compact?: boolean }) {
  return <span className={`${statusClass(status)} verification-status`}><i />{verificationStatusLabel(status)}{status === "verified" && !compact && <small> · demo</small>}</span>;
}
