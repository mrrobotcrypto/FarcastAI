// api/generate.ts
type ReqBody = { prompt?: string; topic?: string; lang?: string };

// Kısa metin + sonda #FarcastAI
function enforceShortOutput(text: string): string {
  if (!text) return "";
  let t = text
    .replace(/^(\s*[-*]\s+)/gm, "")        // "- " veya "* "
    .replace(/^(\s*\d+\.\s+)/gm, "")       // "1. "
    .replace(/^#{1,6}\s+/gm, "");          // "# Başlık"
  const paras = t.split(/\n{2,}/).map(p => p.trim()).filter(Boolean).slice(0, 2);
  t = paras.join("\n\n");
  if (t.length > 700) t = t.slice(0, 680).replace(/\s+\S*$/, "") + "…";
  if (!/#FarcastAI\b/.test(t)) t = t.replace(/\s+$/, "") + " #FarcastAI";
  return t;
}

// Basit dil tespiti (heuristic)
function detectLangAuto(s: string): "tr" | "en" {
  const txt = (s || "").toLowerCase();

  // Açık talimatlar override
  if (/\bwrite (it|the answer)? in english\b|\benglish only\b/.test(txt)) return "en";
  if (/(türkçe yaz|türkçe cevapla|cevabı türkçe yaz)/.test(txt)) return "tr";

  // Türkçe karakter / kelime ipuçları
  const hasTrChar = /[çğıöşü]/i.test(txt);
  const trWords = /\b(ve|bir|nedir|nasıl|için|hakkında|olarak|çok|daha|ama|fiyat|kadar)\b/i.test(txt);

  // İngilizce ipuçları
  const enWords = /\b(the|and|what|how|why|is|are|with|about)\b/i.test(txt);

  if (hasTrChar || trWords) return "tr";
  if (enWords) return "en";

  // Latin-only ise çoğu zaman EN
  const latinOnly = /^[\x00-\x7F\s\p{P}]+$/u.test(txt);
  return latinOnly ? "en" : "tr";
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

    // Self-test
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
    let lang: string | "" = ""; // "tr" | "en" | ""

    if (method === "GET") {
      const q = req.query || {};
      prompt = firstNonEmpty(q.prompt, q.topic, q.q, q.text, q.title, q.query);
      lang = (q.lang as string || "").trim().toLowerCase();
    } else if (method === "POST") {
      const ct = String(req.headers?.["content-type"] || "");
      if (ct.includes("application/json")) {
        const raw = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
        prompt = firstNonEmpty(raw.prompt, raw.topic, raw.q, raw.text, raw.title, raw.query);
        lang = (raw.lang as string || "").trim().toLowerCase();
      } else if (ct.includes("application/x-www-form-urlencoded")) {
        const bodyStr = typeof req.body === "string" ? req.body : "";
        const params = new URLSearchParams(bodyStr);
        prompt = firstNonEmpty(
          params.get("prompt"),
          params.get("topic"),
          params.get("q"),
          params.get("text"),
          params.get("title"),
          params.get("query")
        );
        lang = (params.get("lang") || "").trim().toLowerCase();
      } else if (ct.startsWith("multipart/form-data")) {
        return res.status(415).json({
          ok: false,
          message: "multipart/form-data desteklenmiyor. JSON veya GET querystring kullanın.",
          hint: "GET /api/generate?prompt=... veya POST application/json {\"prompt\":\"...\"}"
        });
      } else { // text/plain vs.
        const raw = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
        prompt = firstNonEmpty(raw.prompt, raw.topic, raw.q, raw.text, raw.title, raw.query);
        lang = (raw.lang as string || "").trim().toLowerCase();
      }
    } else {
      return res.status(405).json({ ok: false, message: "Only GET or POST" });
    }

    if (!prompt) {
      return res.status(400).json({
        ok: false,
        message: "Missing prompt/topic",
        examples: [
          "/api/generate?prompt=Merhaba",
          "/api/generate?topic=Bitcoin%20nedir",
          "POST JSON: {\"prompt\":\"Merhaba\"} veya {\"topic\":\"Bitcoin nedir\"}"
        ]
      });
    }
    // ---------- /INPUT ----------

    // 1) Eğer lang param gelmişse onu kullan; 2) gelmemişse otomatik tespit
    const auto = detectLangAuto(prompt);
    const langFinal: "tr" | "en" = (lang === "tr" || lang === "en") ? (lang as any) : auto;

    // Kurallar (senin şablonun)
    const rulesTR = `Aşağıdaki isteğe KISA ve ÖZ yanıt ver. Kurallar:
- 1 paragraf, en fazla 2 paragraf.
- Liste/madde işareti kullanma; akıcı düz metin yaz.
- Gevezelik etme; somut ve net ol.
- Yanıtın SONUNDA mutlaka "#FarcastAI" etiketi olsun.`;

    const rulesEN = `Respond BRIEFLY and CLEARLY. Rules:
- Prefer 1 paragraph, maximum 2.
- Do not use lists or headings.
- No fluff; be concise and concrete.
- Always END with "#FarcastAI".`;

    const rules = langFinal === "en" ? rulesEN : rulesTR;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { res.status(503).json({ ok: false, message: "GEMINI_API_KEY missing in Vercel env" }); return; }

    const model = process.env.GEMINI_MODEL || "models/gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

    const finalPrompt = `${rules}\n\nUSER PROMPT:\n${prompt}`;

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

    const text = enforceShortOutput(raw || "");

    res.status(200).json({
      ok: true,
      provider: "gemini",
      model,
      lang: langFinal,
      text,
      content: text,
      result: text,
      message: text
    });
  } catch (err: any) {
    console.error("generate error", err);
    res.status(500).json({ ok: false, message: err?.message || "Internal Server Error" });
  }
}
