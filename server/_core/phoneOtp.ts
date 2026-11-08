const MSG91_SEND_URL = "https://control.msg91.com/api/v5/otp";
const MSG91_VERIFY_URL = "https://control.msg91.com/api/v5/otp/verify";
const OTP_EXPIRY_MINUTES = 5;
const SEND_COOLDOWN_MS = 30_000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_PHONE = 5;
const MAX_SENDS_PER_IP = 25;
const VERIFY_WINDOW_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 8;

type SendLimit = { windowStartedAt: number; count: number; lastSentAt: number };
type VerifyLimit = { windowStartedAt: number; count: number };

const phoneSendLimits = new Map<string, SendLimit>();
const ipSendLimits = new Map<string, SendLimit>();
const verifyLimits = new Map<string, VerifyLimit>();

export class PhoneOtpError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = "PhoneOtpError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function normalizeIndianPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0091")) digits = digits.slice(4);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return "91" + digits;
}

function requireProviderConfig() {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID?.trim();
  if (!authKey || !templateId) {
    throw new PhoneOtpError("OTP_NOT_CONFIGURED", "Phone verification is not configured yet. Please contact Vayal support.", 503);
  }
  return { authKey, templateId };
}

function cleanOldEntries(now: number) {
  for (const [key, entry] of phoneSendLimits) if (now - entry.windowStartedAt > SEND_WINDOW_MS) phoneSendLimits.delete(key);
  for (const [key, entry] of ipSendLimits) if (now - entry.windowStartedAt > SEND_WINDOW_MS) ipSendLimits.delete(key);
  for (const [key, entry] of verifyLimits) if (now - entry.windowStartedAt > VERIFY_WINDOW_MS) verifyLimits.delete(key);
}

function consumeSendQuota(phone: string, ipAddress: string) {
  const now = Date.now();
  cleanOldEntries(now);
  const previousPhone = phoneSendLimits.get(phone);
  if (previousPhone && now - previousPhone.windowStartedAt < SEND_WINDOW_MS) {
    const waitMs = SEND_COOLDOWN_MS - (now - previousPhone.lastSentAt);
    if (waitMs > 0) {
      const seconds = Math.ceil(waitMs / 1000);
      throw new PhoneOtpError("OTP_COOLDOWN", "Please wait " + seconds + " seconds before requesting another code.", 429);
    }
    if (previousPhone.count >= MAX_SENDS_PER_PHONE) {
      throw new PhoneOtpError("OTP_RATE_LIMITED", "Too many codes have been requested for this number. Try again in an hour.", 429);
    }
  }
  const previousIp = ipSendLimits.get(ipAddress);
  if (previousIp && now - previousIp.windowStartedAt < SEND_WINDOW_MS && previousIp.count >= MAX_SENDS_PER_IP) {
    throw new PhoneOtpError("OTP_RATE_LIMITED", "Too many OTP requests have come from this network. Try again later.", 429);
  }
  phoneSendLimits.set(phone, {
    windowStartedAt: previousPhone && now - previousPhone.windowStartedAt < SEND_WINDOW_MS ? previousPhone.windowStartedAt : now,
    count: previousPhone && now - previousPhone.windowStartedAt < SEND_WINDOW_MS ? previousPhone.count + 1 : 1,
    lastSentAt: now,
  });
  ipSendLimits.set(ipAddress, {
    windowStartedAt: previousIp && now - previousIp.windowStartedAt < SEND_WINDOW_MS ? previousIp.windowStartedAt : now,
    count: previousIp && now - previousIp.windowStartedAt < SEND_WINDOW_MS ? previousIp.count + 1 : 1,
    lastSentAt: now,
  });
}

function consumeVerifyQuota(phone: string, ipAddress: string) {
  const now = Date.now();
  cleanOldEntries(now);
  const key = phone + "|" + ipAddress;
  const previous = verifyLimits.get(key);
  if (previous && now - previous.windowStartedAt < VERIFY_WINDOW_MS && previous.count >= MAX_VERIFY_ATTEMPTS) {
    throw new PhoneOtpError("OTP_ATTEMPTS_EXCEEDED", "Too many attempts. Request a new code after a few minutes.", 429);
  }
  verifyLimits.set(key, {
    windowStartedAt: previous && now - previous.windowStartedAt < VERIFY_WINDOW_MS ? previous.windowStartedAt : now,
    count: previous && now - previous.windowStartedAt < VERIFY_WINDOW_MS ? previous.count + 1 : 1,
  });
}

async function readProviderResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return value && typeof value === "object" ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export async function sendIndianPhoneOtp(phoneValue: string, ipAddress: string) {
  const phone = normalizeIndianPhone(phoneValue);
  if (!phone) throw new PhoneOtpError("INVALID_PHONE", "Enter a valid 10-digit Indian mobile number.", 400);
  const { authKey, templateId } = requireProviderConfig();
  consumeSendQuota(phone, ipAddress || "unknown");

  const url = new URL(MSG91_SEND_URL);
  url.searchParams.set("template_id", templateId);
  url.searchParams.set("mobile", phone);
  url.searchParams.set("otp_length", "6");
  url.searchParams.set("otp_expiry", String(OTP_EXPIRY_MINUTES));
  url.searchParams.set("realTimeResponse", "1");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { accept: "application/json", authkey: authKey, "content-type": "application/json" },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new PhoneOtpError("OTP_PROVIDER_UNAVAILABLE", "We could not reach the SMS provider. Please try again later.", 502);
  }

  const payload = await readProviderResponse(response);
  if (!response.ok || String(payload.type || "").toLowerCase() !== "success") {
    if (response.status === 401) {
      throw new PhoneOtpError("OTP_PROVIDER_CONFIG", "The SMS provider rejected its credentials. Please contact Vayal support.", 503);
    }
    if (response.status === 429) {
      throw new PhoneOtpError("OTP_PROVIDER_LIMIT", "The SMS provider is temporarily limiting requests. Please try again later.", 429);
    }
    throw new PhoneOtpError("OTP_SEND_FAILED", "The SMS provider could not send the code. Check the number or try again later.", 502);
  }
  return { success: true, resendAfterSeconds: SEND_COOLDOWN_MS / 1000 };
}

export async function verifyIndianPhoneOtp(phoneValue: string, otp: string, ipAddress: string): Promise<boolean> {
  const phone = normalizeIndianPhone(phoneValue);
  if (!phone) throw new PhoneOtpError("INVALID_PHONE", "Enter a valid 10-digit Indian mobile number.", 400);
  if (!/^\d{6}$/.test(otp)) throw new PhoneOtpError("INVALID_OTP", "Enter the six-digit code sent to your phone.", 400);
  const { authKey } = requireProviderConfig();
  consumeVerifyQuota(phone, ipAddress || "unknown");

  const url = new URL(MSG91_VERIFY_URL);
  url.searchParams.set("mobile", phone);
  url.searchParams.set("otp", otp);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json", authkey: authKey },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new PhoneOtpError("OTP_PROVIDER_UNAVAILABLE", "We could not reach the SMS provider. Please try again.", 502);
  }

  const payload = await readProviderResponse(response);
  if (response.status === 401) {
    throw new PhoneOtpError("OTP_PROVIDER_CONFIG", "The SMS provider rejected its credentials. Please contact Vayal support.", 503);
  }
  if (response.status >= 500 || response.status === 429) {
    throw new PhoneOtpError("OTP_PROVIDER_UNAVAILABLE", "The SMS provider is temporarily unavailable. Please try again.", 502);
  }
  if (!response.ok) return false;

  const message = String(payload.message || "").trim().toLowerCase();
  return message === "otp verified success"
    || message === "otp verified successfully"
    || message === "number_verified_successfully"
    || (String(payload.type || "").toLowerCase() === "success" && message.includes("verified"));
}

export function resetPhoneOtpRuntimeState() {
  phoneSendLimits.clear();
  ipSendLimits.clear();
  verifyLimits.clear();
}
