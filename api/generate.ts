// api/generate.ts
type ReqBody = { prompt?: string; topic?: string; lang?: string };

// Kısa metin zorunluluğu + sonda #FarcastAI etiketi
function enforceShortOutput(text: string): string {
  if (!text) return "";

  // Madde işaretleri ve başlıkları sadeleştir
  let t = text
    .replace(/^(\s*[-*]\s+)/gm, "")       // "- " veya "* " başlarını kaldır
    .replace(/^(\s*\d+\.\s+)/gm, "")      // "1. " gibi numaralı listeleri kaldır
    .replace(/^#{1,6}\s+/gm, "");         // "# Başlık" markdown başlıklarını kaldır

  // Paragraflara böl, en fazla 2 paragraf bırak
  const paras = t.split(/\n{2,}/).map(p => p.trim()).filter(Boolean).slice(0, 2);
  t = paras.join("\n\n");

  // Çok uzunsa yumuşat (yaklaşık 700 karakter)
  if (t.length > 700) t = t.slice(0, 680).replace(/\s+\S*$/, "") + "…";

  // Sonda #FarcastAI yoksa ekle
  if (!/#FarcastAI\b/.test(t)) t = t.replace(/\s+$/, "") + " #FarcastAI";

  return t;
}

function safeJson(s: string) { try { return JSON.parse(s); } catch { return {}; } }

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

    // Self-test (runtime ayakta mı?)
    if (req.method === "GET" && (req.query?.selftest === "1" || req.query?.selftest === "true")) {
      res.status(200).json({ ok: true, selftest: true, runtime: "node", ts: Date.now() });
      return;
    }

    // ---------- INPUT ----------
    const method = String(req.method || "GET").toUpperCase();

    const firstNonEmpty = (...vals: any[]): string => {
      for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
      return "";
    };

    let prompt = "";
    let lang = "en"; // default: en

    if (method === "GET") {
      const q = req.query || {};
      // URL'den: ?prompt=, ?topic=, ?q=, ?text=, ?title=, ?query=
      prompt = firstNonEmpty(q.prompt, q.topic, q.q, q.text, q.title, q.query);
      lang = String(q.lang || q.language || "en").toLowerCase();
    } else if (method === "POST") {
      const ct = String(req.headers?.["content-type"] || "");
      if (ct.includes("application/json")) {
        const raw = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
        prompt = firstNonEmpty(raw.prompt, raw.topic, raw.q, raw.text, raw.title, raw.query);
        lang = String(raw.lang || raw.language || "en").toLowerCase();
      } else if (ct.includes("application/x-www-form-urlencoded")) {
        // URL-encoded body
        const bodyStr = typeof req.body === "string" ? req.body : "";
        try {
          const params = new URLSearchParams(bodyStr);
          prompt = firstNonEmpty(
            params.get("prompt"),
            params.get("topic"),
            params.get("q"),
            params.get("text"),
            params.get("title"),
            params.get("query")
          );
          lang = String(params.get("lang") || params.get("language") || "en").toLowerCase();
        } catch { /* yoksay */ }
      } else if (ct.startsWith("multipart/form-data")) {
        return res.status(415).json({
          ok: false,
          message: "multipart/form-data desteklenmiyor. JSON veya GET querystring kullanın.",
          hint: "GET /api/generate?prompt=... veya POST application/json {\"prompt\":\"...\"}"
        });
      } else if (ct === "" || ct === "text/plain") {
        // Bazı istemciler content-type göndermiyor → basit deneme
        const raw = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
        prompt = firstNonEmpty(raw.prompt, raw.topic, raw.q, raw.text, raw.title, raw.query);
        lang = String((raw as any)?.lang || (raw as any)?.language || "en").toLowerCase();
      } else {
        return res.status(415).json({
          ok: false,
          message: `Unsupported media type: ${ct}`,
          hint: "application/json gönderin veya GET ?prompt= kullanın"
        });
      }
    } else {
      return res.status(405).json({ ok: false, message: "Only GET or POST" });
    }

    if (!prompt) {
      return res.status(400).json({
        ok: false,
        message: "Missing prompt/topic",
        examples: [
          "/api/generate?prompt=Merhaba&lang=tr",
          "/api/generate?topic=Bitcoin%20nedir&lang=tr",
          "POST JSON: {\"prompt\":\"What is Bitcoin?\", \"lang\":\"en\"}"
        ]
      });
    }
    // ---------- /INPUT ----------

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { res.status(503).json({ ok: false, message: "GEMINI_API_KEY missing in Vercel env" }); return; }

    const model = process.env.GEMINI_MODEL || "models/gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

    // Dil talimatı
    const langLine = lang === "tr"
      ? "Yanıtı TÜRKÇE yaz."
      : "Write the answer in ENGLISH.";

    // KISA-ÇIKTI talimatı ile sarmalanmış nihai prompt
    const finalPrompt =
`${langLine}
KISA ve ÖZ yanıt ver. ÇIKTI KURALLARI:
- Tercihen 1 paragraf, en fazla 2 paragraf.
- Liste/madde işareti kullanma; akıcı düz metin yaz.
- Gereksiz uzatmadan somut ve net ol.
- Yanıtın SONUNDA mutlaka "#FarcastAI" etiketi olsun.

İSTEK / REQUEST:
${prompt}`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
      generationConfig: { temperature: 0.6 },
    };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const textBody = await r.text().catch(() => "");
    let data: any = {};
    try { data = JSON.parse(textBody); } catch {}

    if (!r.ok) {
      const status = data?.error?.code || r.status;
      const message = data?.error?.message || "Gemini error";
      const retryAfter = r.headers.get("retry-after") || undefined;
      res.status(status).json({
        ok: false, provider: "gemini", status, message, retryAfter,
        body: textBody.slice(0, 1000)
      });
      return;
    }

    const raw =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n") ??
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Son aşamada da kısalık/etiket garantisi
    const text = enforceShortOutput(raw || "");

    res.status(200).json({
      ok: true,
      via: method,
      provider: "gemini",
      model,
      lang,
      text,           // modern
      content: text,  // alternatif
      result: text,   // legacy
      message: text   // legacy
    });
  } catch (err: any) {
    console.error("generate error", err);
    res.status(500).json({ ok: false, message: err?.message || "Internal Server Error" });
  }
}
