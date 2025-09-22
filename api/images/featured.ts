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

    const key = process.env.PEXELS_API_KEY;
    if (!key) { res.status(503).json({ message: "PEXELS_API_KEY missing in Vercel env" }); return; }

    const perPage = Math.min(parseInt((req.query?.per_page || "6") as string, 10) || 6, 30);
    const page = Math.max(parseInt((req.query?.page || "1") as string, 10) || 1, 1);

    // Pexels curated feed
    const params = new URLSearchParams({ per_page: String(perPage), page: String(page) });
    const url = `https://api.pexels.com/v1/curated?${params.toString()}`;

    const r = await fetch(url, { headers: { Authorization: key } });
    const raw = await r.json();

    if (!r.ok) {
      res.status(r.status).json(raw);
      return;
    }

    const images = (raw.photos ?? []).map((p: any) => ({
      url: p?.src?.medium || p?.src?.landscape || p?.src?.original || null,
      alt: p?.alt || "",
      photographer: p?.photographer || "",
      color: p?.avg_color || ""
    })).filter((x: any) => !!x.url);

    res.status(200).json({
      ok: true,
      count: images.length,
      images,
      photos: raw.photos,
      page: raw.page,
      per_page: raw.per_page,
      total_results: raw.total_results
    });
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Internal Server Error" });
  }
}
