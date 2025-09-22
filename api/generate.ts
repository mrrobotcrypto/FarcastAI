// api/generate.ts
type ReqBody = { prompt?: string; topic?: string; lang?: string };

export default async function handler(req: any, res: any) {
  try {
    // ---- CORS + preflight ----
    const origin = (req.headers?.origin as string) || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    // ---- Body/Query'den prompt topla (tüm methodlar) ----
    let body: ReqBody = {};
    if (req.method === "GET") {
      const q = req.query || {};
      body = { prompt: (q.prompt || q.topic || "").toString() } as any;
    } else {
      // JSON + FormData (multipart/urlencoded) destekle
      const raw = (typeof req.body === "string") ? safeJson(req.body) : (req.body || {});
      body = normalizeBody(raw);
    }

    const prompt = body.prompt ?? body.topic ?? "";
    if (!prompt) return res.status(400).json({ message: "prompt/topic required" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ message: "GEMINI_API_KEY missing in Vercel env" });

    const model = "models/gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(502).json({ message: "Gemini error", status: r.status, body: text.slice(0, 1000) });
    }

    const data = await r.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join("\n") ??
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return res.status(200).json({ ok: true, result: text, via: req.method });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
}

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return {}; }
}

function normalizeBody(raw: any): ReqBody {
  // form-data/url-encoded durumunda değerler objeye string olarak düşer
  if (raw && typeof raw === "object") {
    const prompt = raw.prompt ?? raw.topic ?? raw.text ?? "";
    const lang = raw.lang ?? raw.language ?? undefined;
    return { prompt: String(prompt || ""), lang: lang ? String(lang) : undefined };
  }
  return {};
}
