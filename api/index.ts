// api/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { makeApp } from "../server/app";

// Tek instance (soğuk başlangıçta kurulur)
const app = makeApp();

// Vercel: default export edilen handler'ı çağırır
export default (req: VercelRequest, res: VercelResponse) => {
  // @ts-ignore - Express signature uyumlu
  return app(req, res);
};
