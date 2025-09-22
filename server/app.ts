// server/app.ts (GEÇİCİ, minimal)
import express from "express";
// import { registerRoutes } from "./routes"; // GEÇİCİ kapalı

export function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Basit sağlık ucu
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true, ts: Date.now() });
  });

  // Hata yakalayıcı (response'tan sonra THROW YOK)
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    console.error("API Error:", { status, message, stack: err?.stack });
    if (!res.headersSent) res.status(status).json({ message });
  });

  return app;
}
