// api/index.ts
import { makeApp } from "../server/app";

const app = makeApp();

export default function handler(req: any, res: any) {
  // @ts-ignore - Express signature ile uyumlu
  return app(req, res);
}
