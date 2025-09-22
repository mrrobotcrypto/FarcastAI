// server/index.ts  (lokal/dev için)
import { createServer } from "http";
import { makeApp } from "./app";
import { setupVite, serveStatic, log } from "./vite";

(async () => {
  const app = makeApp();
  const server = createServer(app);

  // Dev ortamında Vite middleware; prod'da statik dosyalar
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
