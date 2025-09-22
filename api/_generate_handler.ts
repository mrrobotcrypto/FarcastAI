// api/_generate_handler.ts
type Req = any; type Res = any;

async function callGemini(prompt: string, modelName: string, apiKey: string) {
  // Minimal Gemini JSON payload (text-only)
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }]}],
    generationConfig: { temperature: 0.7 }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const txt = await r.text();
  let json: any = {};
  try { json = JSON.parse(txt); } catch { /* boş */ }

  if (!r.ok) {
    // 429/403/401/5xx olduğunda ham gövdeyi ilet
    const status = json?.error?.code || r.status;
    const message = json?.error?.message || "Gemini error";
    const retryAfter = r.headers.get("retry-after");
    return { ok: false, status, message, body: txt, retryAfter };
  }

  // Gemini cevap parsı
  const candidate = json?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const text = parts.map((p: any) => p?.text).filter(Boolean).join("\n").trim();

  return { ok: true, text, raw: json };
}

export default async function handler(req: Req, res: Res) {
  try {
    // CORS + preflight
    const origin = (req.headers?.origin as string) || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") { res.status(204).end(); return; }

    // Input
    const method = req.method;
    const q = (req.query?.q ?? req.query?.prompt ?? (method === "GET" ? "" : undefined));
    const bodyPrompt = (req.body?.prompt ?? req.body?.q);
    const prompt = ((typeof bodyPrompt === "string" && bodyPrompt) ||
                    (typeof q === "string" && q) || "").trim();

    if (!prompt) {
      res.status(400).json({ ok: false, message: "Missing prompt (use ?q= or ?prompt= or JSON {prompt})" });
      return;
    }

    // Config
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ ok: false, message: "GEMINI_API_KEY missing in Vercel env" });
      return;
    }
    const model = process.env.GEMINI_MODEL || "models/gemini-1.5-flash";

    // Call
    const out = await callGemini(prompt, model, apiKey);

    if (!out.ok) {
      const status = out.status || 500;
      res.status(status).json({
        ok: false,
        provider: "gemini",
        status,
        message: out.message,
        retryAfter: out.retryAfter || undefined,
        body: out.body?.slice?.(0, 4000) || undefined
      });
      return;
    }

    const text = out.text || "";

    // UI’lerin tamamını doyurmak için aynı anda birden çok alan dönüyorum:
    // - text / content: modern
    // - result / message: bazı eski UI'ler
    // - via: hangi method, model: bilgi
    res.status(200).json({
      ok: true,
      provider: "gemini",
      model,
      via: method,
      text,              // <- modern
      content: text,     // <- modern alternatif
      result: text,      // <- legacy
      message: text      // <- çok legacy
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, message: e?.message || "Internal Server Error" });
  }
}
