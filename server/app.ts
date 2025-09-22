// server/app.ts (GEÇİCİ TEŞHİS SÜRÜMÜ)
import express from "express";
// import { registerRoutes } from "./routes"; // ← ŞİMDİLİK KAPALI

export function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true, ts: Date.now() });
  });

  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    console.error("API Error:", { status, message, stack: err?.stack });
    if (!res.headersSent) res.status(status).json({ message });
  });

  return app;
}
