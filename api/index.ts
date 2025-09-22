// api/index.ts
import { makeApp } from "../server/app";

const app = makeApp();

// Tip importu kullanmadan çalıştırıyoruz
export default function handler(req: any, res: any) {
  // Express app, (req,res) imzasıyla uyumlu
  // @ts-ignore
  return app(req, res);
}
