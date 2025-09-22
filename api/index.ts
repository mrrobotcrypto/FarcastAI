import type { VercelRequest, VercelResponse } from "@vercel/node";
import { makeApp } from "../server/app";

const app = makeApp();

export default (req: VercelRequest, res: VercelResponse) => {
  // @ts-ignore
  return app(req, res);
};
