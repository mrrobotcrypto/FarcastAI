// api/images/featured.ts
export const config = {
  api: {
    bodyParser: false, // sadece GET
  },
};

type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  alt?: string;
  photographer?: string;
  avg_color?: string;
  src?: {
    original?: string;
    landscape?: string;
    medium?: string;
  };
};

function pickUrl(p: PexelsPhoto): string | null {
  return p?.src?.landscape || p?.src?.medium || p?.src?.original || null;
}

async function pexelsSearch(query: string, perPage: number, page: number, key: string) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`;
  const r = await fetch(url, { headers: { Authorization: key } });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    const err = new Error(`Pexels error ${r.status}: ${body.slice(0, 400)}`);
    // küçük gecikmeli retry önerisi yerine direkt hata
    throw err;
  }
  return r.json();
}

export default async function handler(req: any, res: any) {
  try {
    // ----- CORS & Methods -----
    const origin = (req.headers?.origin as string) || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") { res.status(204).end(); return; }
    if (req.method !== "GET") { res.status(405).json({ ok: false, message: "Only GET" }); return; }

    const key = process.env.PEXELS_API_KEY;
    if (!key) { res.status(503).json({ ok: false, message: "PEXELS_API_KEY missing in Vercel env" }); return; }

    // ----- Saatlik cache anahtarı -----
    const hourBucket = Math.floor(Date.now() / 3600000); // her saat değişir
    const cacheKey = `featured:${hourBucket}`;

    // Vercel Node runtime: aynı lambda süresince global değişken korunabilir
    const g = globalThis as any;
    g.__FEATURED_CACHE__ = g.__FEATURED_CACHE__ || new Map<string, any>();
    if (g.__FEATURED_CACHE__.has(cacheKey)) {
      const payload = g.__FEATURED_CACHE__.get(cacheKey);
      res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=59");
      res.status(200).json(payload);
      return;
    }

    // ----- Kategoriler -----
    // Her birinden 2 görsel: toplam 6
    const categories = [
      { q: "landscape scenery nature", take: 2 },
      { q: "cryptocurrency bitcoin blockchain", take: 2 },
      { q: "nft gaming metaverse", take: 2 },
    ];

    const perCatFetch = 14; // yeterince havuz (landscape filtrelemek için)
    const page = 1;

    const images: Array<{ id: number; url: string; alt: string; photographer: string; color?: string }> = [];

    for (const cat of categories) {
      const data = await pexelsSearch(cat.q, perCatFetch, page, key);
      const photos: PexelsPhoto[] = data?.photos || [];

      // Landscape öncelikli
      const landscape = photos.filter(p => (p?.width || 0) >= (p?.height || 0));
      const pool = (landscape.length >= cat.take) ? landscape : photos;

      // Seç ve normalize et
      const picked = pool
        .filter(p => !!pickUrl(p))
        .slice(0, cat.take)
        .map((p) => ({
          id: p.id,
          url: pickUrl(p)!,
          alt: p.alt || "",
          photographer: p.photographer || "",
          color: p.avg_color || undefined,
        }));

      images.push(...picked);
    }

    const payload = {
      ok: true,
      count: images.length,
      images,             // UI burada doğrudan kullanabilir
      page,
      per_category: 2,    // bilgi amaçlı
      categories: ["landscape", "crypto", "nft/gaming"],
      ts: Date.now(),
    };

    // Cache’e koy
    g.__FEATURED_CACHE__.set(cacheKey, payload);

    // 1 saatlik önbellek başlığı
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=59");
    res.status(200).json(payload);
  } catch (e: any) {
    res.status(500).json({ ok: false, message: e?.message || "Internal Server Error" });
  }
}
