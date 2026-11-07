import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Vayal is currently a browser-local product prototype. Its role sessions,
  // demo bookings and verification states are intentionally not backed by the
  // legacy Manus OAuth/tRPC service.
  app.disable("x-powered-by");
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", app: "vayal", mode: "prototype" });
  });

  // Do not let unfinished legacy API routes fall through to the SPA and return
  // index.html with a misleading 200 response.
  app.all("/api/*", (_req, res) => {
    res.status(404).json({
      error: "API_NOT_AVAILABLE",
      message: "Vayal is running in local-prototype mode. API operations are not enabled.",
    });
  });

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Invalid PORT");
  }

  server.on("error", error => {
    console.error("Server failed:", error.message);
    process.exit(1);
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`Vayal prototype server listening on port ${port}`);
  });
}

startServer().catch(error => {
  console.error("Vayal server startup failed:", error);
  process.exit(1);
});
