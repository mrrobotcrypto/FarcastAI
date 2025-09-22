// api/pexels.ts
export default async function handler(req: any, res: any) {
  try {
    const origin = (req.headers?.origin as string) || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") { res.status(204).end(); return; }

    if (req.method !== "GET") { res.status(405).json({ message: "Only GET" }); return; }

    const q = (req.query?.q || req.query?.query || "").toString().trim();
    if (!q) { res.status(400).json({ message: "q (query) required" }); return; }

    const key = process.env.PEXELS_API_KEY;
    if (!key) { res.status(503).json({ message: "PEXELS_API_KEY missing in Vercel env" }); return; }

    const perPage = Math.min(parseInt((req.query?.per_page || "6") as string, 10) || 6, 30);
    const page = Math.max(parseInt((req.query?.page || "1") as string, 10) || 1, 1);

    const params = new URLSearchParams({ query: q, per_page: String(perPage), page: String(page) });
    const r = await fetch(`https://api.pexels.com/v1/search?${params}`, { headers: { Authorization: key } });
    const txt = await r.text();
    res.status(r.status).send(txt.slice(0, 4000));
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Internal Server Error" });
  }
}
