// api/pexels.ts

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

interface PexelsSearchResponse {
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  total_results: number;
  next_page?: string;
}

async function searchPhotos(query: string, perPage: number = 6): Promise<PexelsPhoto[]> {
  const key = process.env.PEXELS_API_KEY || "";
  if (!key) throw new Error("PEXELS_API_KEY missing in environment");

  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
    { headers: { Authorization: key, "Content-Type": "application/json" } }
  );

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
  }

  const data: PexelsSearchResponse = await response.json();
  return data.photos;
}

async function getFeaturedPhotos(perPage: number = 6): Promise<PexelsPhoto[]> {
  const key = process.env.PEXELS_API_KEY || "";
  if (!key) throw new Error("PEXELS_API_KEY missing in environment");

  const cryptoTerms = [
    "cryptocurrency bitcoin",
    "blockchain technology",
    "digital currency",
    "ethereum trading",
    "crypto investment",
    "bitcoin mining",
    "blockchain network",
    "cryptocurrency exchange",
  ];

  const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const selectedTerm = cryptoTerms[dayOfYear % cryptoTerms.length];

  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(selectedTerm)}&per_page=${perPage}&orientation=landscape`,
    { headers: { Authorization: key, "Content-Type": "application/json" } }
  );

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
  }

  const data: PexelsSearchResponse = await response.json();
  return data.photos;
}

export default async function handler(req: any, res: any) {
  try {
    const origin = (req.headers?.origin as string) || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    if (req.method !== "GET") {
      res.status(405).json({ message: "Only GET" });
      return;
    }

    const mode = (req.query?.mode || "search").toString();
    const q = (req.query?.q || "").toString().trim();

    let photos;
    if (mode === "featured") {
      photos = await getFeaturedPhotos();
    } else {
      if (!q) {
        res.status(400).json({ message: "q (query) required for search" });
        return;
      }
      photos = await searchPhotos(q, 6);
    }

    res.status(200).json({ ok: true, mode, photos });
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Internal Server Error" });
  }
}
