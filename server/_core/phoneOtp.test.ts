import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeIndianPhone,
  resetPhoneOtpRuntimeState,
  sendIndianPhoneOtp,
  verifyIndianPhoneOtp,
} from "./phoneOtp";

describe("Indian phone OTP integration", () => {
  beforeEach(() => {
    resetPhoneOtpRuntimeState();
    vi.stubEnv("MSG91_AUTH_KEY", "test-auth-key");
    vi.stubEnv("MSG91_OTP_TEMPLATE_ID", "test-template-id");
  });

  afterEach(() => {
    resetPhoneOtpRuntimeState();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("normalizes Indian mobile numbers and rejects invalid prefixes", () => {
    expect(normalizeIndianPhone("+91 98765 43210")).toBe("919876543210");
    expect(normalizeIndianPhone("0091-9876543210")).toBe("919876543210");
    expect(normalizeIndianPhone("9876543210")).toBe("919876543210");
    expect(normalizeIndianPhone("1234567890")).toBeNull();
    expect(normalizeIndianPhone("98765")).toBeNull();
  });

  it("sends a six-digit OTP via MSG91 without exposing an OTP to the caller", async () => {
    const mockedFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ type: "success", request_id: "provider-request" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", mockedFetch);
    const result = await sendIndianPhoneOtp("+919876543210", "203.0.113.10");
    expect(result).toEqual({ success: true, resendAfterSeconds: 30 });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    const [requestUrl, options] = mockedFetch.mock.calls[0] as [URL, RequestInit];
    const url = new URL(String(requestUrl));
    expect(url.searchParams.get("mobile")).toBe("919876543210");
    expect(url.searchParams.get("otp_length")).toBe("6");
    expect(url.searchParams.get("otp_expiry")).toBe("5");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({ authkey: "test-auth-key" });
    expect(JSON.stringify(result)).not.toMatch(/\d{6}/);
  });

  it("blocks rapid repeat sends for the same phone number", async () => {
    const mockedFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ type: "success", request_id: "provider-request" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", mockedFetch);
    await sendIndianPhoneOtp("+919876543210", "203.0.113.10");
    await expect(sendIndianPhoneOtp("+919876543210", "203.0.113.10"))
      .rejects.toMatchObject({ code: "OTP_COOLDOWN", statusCode: 429 });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("verifies the code with MSG91 on the server", async () => {
    const mockedFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ type: "success", message: "OTP verified success" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", mockedFetch);
    await expect(verifyIndianPhoneOtp("919876543210", "123456", "203.0.113.10")).resolves.toBe(true);
    const [requestUrl, options] = mockedFetch.mock.calls[0] as [URL, RequestInit];
    const url = new URL(String(requestUrl));
    expect(url.searchParams.get("mobile")).toBe("919876543210");
    expect(url.searchParams.get("otp")).toBe("123456");
    expect(options.method).toBe("GET");
    expect(options.headers).toMatchObject({ authkey: "test-auth-key" });
  });

  it("returns false for an incorrect or expired code", async () => {
    const mockedFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ type: "error", message: "OTP not verified" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", mockedFetch);
    await expect(verifyIndianPhoneOtp("919876543210", "654321", "203.0.113.10")).resolves.toBe(false);
  });

  it("fails closed when provider credentials are absent", async () => {
    vi.stubEnv("MSG91_AUTH_KEY", "");
    await expect(sendIndianPhoneOtp("919876543210", "203.0.113.10"))
      .rejects.toMatchObject({ code: "OTP_NOT_CONFIGURED", statusCode: 503 });
  });
});
