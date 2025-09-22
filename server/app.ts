// server/app.ts
import express from "express";
import { registerRoutes } from "./routes";

export function makeApp() {
  const app = express();

  // Basit CORS
  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // basit sağlık ucu
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true, ts: Date.now() });
  });

  // tüm /api/... rotaları
  registerRoutes(app);

  // Hata yakalayıcı — response’tan sonra THROW ETME!
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    console.error("API Error:", { status, message, stack: err?.stack });
    if (!res.headersSent) res.status(status).json({ message });
  });

  return app;
}
