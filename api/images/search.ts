export default async function handler(req: any, res: any) {
  try {
    // CORS + preflight
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
    const orientation = (req.query?.orientation || "").toString();
    const size = (req.query?.size || "").toString();
    const color = (req.query?.color || "").toString();

    const params = new URLSearchParams({ query: q, per_page: String(perPage), page: String(page) });
    if (orientation) params.set("orientation", orientation);
    if (size) params.set("size", size);
    if (color) params.set("color", color);

    const url = `https://api.pexels.com/v1/search?${params.toString()}`;

    const r = await fetch(url, { headers: { Authorization: key } });
    const txt = await r.text();
    // Pexels ne döndürdüyse aynı status ile forward ediyoruz (teşhis için iyi)
    res.status(r.status).send(txt.slice(0, 4000));
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Internal Server Error" });
  }
}
