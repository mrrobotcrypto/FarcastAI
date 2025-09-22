// api/generate.ts
type ReqBody = { prompt?: string; topic?: string; lang?: string };

export default async function handler(req: any, res: any) {
  try {
    // CORS + preflight
    const origin = (req.headers?.origin as string) || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") { res.status(204).end(); return; }

    // Self-test (runtime çalışıyor mu?)
    if (req.method === "GET" && (req.query?.selftest === "1" || req.query?.selftest === "true")) {
      res.status(200).json({ ok: true, selftest: true, runtime: "node", ts: Date.now() });
      return;
    }

    // Input
    let body: ReqBody = {};
    if (req.method === "GET") {
      const q = req.query || {};
      body = { prompt: (q.prompt || q.topic || q.q || "").toString() } as any;
    } else if (req.method === "POST") {
      const raw = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
      body = normalizeBody(raw);
    } else {
      res.status(405).json({ message: "Only GET or POST" });
      return;
    }

    const prompt = (body.prompt ?? body.topic ?? "").trim();
    if (!prompt) { res.status(400).json({ message: "prompt/topic required" }); return; }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { res.status(503).json({ message: "GEMINI_API_KEY missing in Vercel env" }); return; }

    const model = process.env.GEMINI_MODEL || "models/gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7 } };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const textBody = await r.text().catch(() => "");
    let data: any = {};
    try { data = JSON.parse(textBody); } catch {}

    if (!r.ok) {
      // Google tarafının verdiği gerçek kodu ilet (429/401/403 vs.)
      const status = data?.error?.code || r.status;
      const message = data?.error?.message || "Gemini error";
      const retryAfter = r.headers.get("retry-after") || undefined;
      res.status(status).json({ ok: false, provider: "gemini", status, message, retryAfter, body: textBody.slice(0, 1000) });
      return;
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n") ??
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    res.status(200).json({
      ok: true,
      via: req.method,
      provider: "gemini",
      model,
      // UI ne isterse beslensin:
      text,
      content: text,
      result: text,
      message: text
    });
  } catch (err: any) {
    // Vercel loglarında görebilmen için:
    console.error("generate error", err);
    res.status(500).json({ ok: false, message: err?.message || "Internal Server Error" });
  }
}

function safeJson(s: string) { try { return JSON.parse(s); } catch { return {}; } }

function normalizeBody(raw: any): ReqBody {
  if (raw && typeof raw === "object") {
    const prompt = raw.prompt ?? raw.topic ?? raw.text ?? raw.q ?? "";
    const lang = raw.lang ?? raw.language ?? undefined;
    return { prompt: String(prompt || ""), lang: lang ? String(lang) : undefined };
  }
  return {};
}
