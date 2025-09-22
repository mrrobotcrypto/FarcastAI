// api/generate.ts
type ReqBody = { prompt?: string; topic?: string; lang?: string };

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ message: "Only POST" });
      return;
    }

    // Body'yi güvenli oku
    const body: ReqBody = (() => {
      try { return typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); }
      catch { return {}; }
    })();

    const prompt = body.prompt ?? body.topic ?? "";
    if (!prompt) {
      res.status(400).json({ message: "prompt/topic required" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ message: "GEMINI_API_KEY missing in Vercel env" });
      return;
    }

    // Basit Gemini 1.5-pro text generation
    const model = "models/gemini-1.5-pro";
    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      res.status(502).json({ message: "Gemini error", status: r.status, body: text.slice(0, 1000) });
      return;
    }

    const data = await r.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join("\n") ??
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "";

    res.status(200).json({ ok: true, result: text });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
}
