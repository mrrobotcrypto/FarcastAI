// server/app.ts
import express from "express";
import { registerRoutes } from "./routes";

export function makeApp() {
  const app = express();

  // CORS: Vercel domaini otomatik kabul edelim (gerekirse sıkılaştırırız)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
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

  // Tüm API rotaları
  // (routes.ts içinde /api/... olarak zaten tanımlı)
  // Örn: /api/generate, /api/drafts, /api/users, /api/publish, /api/webhook ...
  registerRoutes(app);

  return app;
}
