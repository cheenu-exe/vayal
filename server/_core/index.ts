import "dotenv/config";
import express, { type Request, type Response } from "express";
import { createServer } from "http";
import { serveStatic, setupVite } from "./vite";
import { normalizeIndianPhone, PhoneOtpError, sendIndianPhoneOtp, verifyIndianPhoneOtp } from "./phoneOtp";

function clientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function sendOtpError(res: Response, error: unknown) {
  if (error instanceof PhoneOtpError) {
    return res.status(error.statusCode).json({ success: false, code: error.code, error: error.message });
  }
  console.error("[Phone OTP] Unexpected server error.");
  return res.status(500).json({ success: false, error: "Phone verification is temporarily unavailable. Please try again later." });
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // The OTP endpoints run server-side. MSG91 generates and verifies the code;
  // no OTP or SMS credential is ever sent to the browser.
  app.disable("x-powered-by");
  app.post("/api/auth/otp/request", async (req, res) => {
    const phone = normalizeIndianPhone(req.body?.phone);
    if (!phone) return res.status(400).json({ success: false, error: "Enter a valid 10-digit Indian mobile number." });
    try {
      return res.status(200).json(await sendIndianPhoneOtp(phone, clientIp(req)));
    } catch (error) {
      return sendOtpError(res, error);
    }
  });

  app.post("/api/auth/otp/verify", async (req, res) => {
    const phone = normalizeIndianPhone(req.body?.phone);
    const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
    if (!phone) return res.status(400).json({ success: false, error: "Enter a valid 10-digit Indian mobile number." });
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, error: "Enter the six-digit code sent to your phone." });
    try {
      const verified = await verifyIndianPhoneOtp(phone, otp, clientIp(req));
      if (!verified) return res.status(400).json({ success: false, error: "The code is incorrect or expired. Check it and try again, or request a new code." });
      return res.status(200).json({ success: true, verified: true });
    } catch (error) {
      return sendOtpError(res, error);
    }
  });

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", app: "vayal", mode: "prototype" });
  });

  // Do not let unfinished legacy API routes fall through to the SPA.
  app.all("/api/*", (_req, res) => {
    res.status(404).json({
      error: "API_NOT_AVAILABLE",
      message: "This Vayal API route is not available.",
    });
  });

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log("Vayal server listening on port " + port));
}

startServer().catch(error => {
  console.error("Vayal server startup failed:", error);
  process.exit(1);
});
