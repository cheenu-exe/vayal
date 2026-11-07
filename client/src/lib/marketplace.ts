import type { Language } from "./i18n";

export function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export function unitLabel(unit: string, language: Language = "en") {
  const labels: Record<string, { en: string; ta: string }> = {
    hour: { en: "hour", ta: "மணி" }, acre: { en: "acre", ta: "ஏக்கர்" }, day: { en: "day", ta: "நாள்" }, trip: { en: "trip", ta: "பயணம்" },
  };
  return labels[unit]?.[language] || unit;
}

export function statusLabel(status: string, t: (key: "statusPending" | "statusAccepted" | "statusRejected" | "statusCancelled" | "statusCompleted") => string) {
  const key = ({ pending: "statusPending", accepted: "statusAccepted", rejected: "statusRejected", cancelled: "statusCancelled", completed: "statusCompleted" } as const)[status as "pending" | "accepted" | "rejected" | "cancelled" | "completed"];
  return key ? t(key) : status;
}
