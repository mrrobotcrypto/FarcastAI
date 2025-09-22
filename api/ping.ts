// api/ping.ts
export default function handler(_req: any, res: any) {
  res.status(200).json({ pong: true, ts: Date.now() });
}
