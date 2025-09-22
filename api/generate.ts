// api/generate.ts
type ReqBody = { prompt?: string; topic?: string; lang?: string };

export default async function handler(req: any, res: any) {
  try {
    // ---- Body/Query'den prompt topla (GET ve POST destekli) ----
    let body: ReqBody = {};
    if (req.method === "GET") {
      const q = req.query || {};
      body = { prompt: (q.prompt || q.topic || "").toString() } as any;
    } else if (req.method === "POST") {
      body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    } else {
      // Diğer methodlar da gelsin istersen bu bloğu kaldırabilirsin
      return res.status(405).json({ message: "Only GET or POST" });
    }

    const prompt = body.prompt ?? body.topic ?? "";
    if (!prompt) return res.status(400).json({ message: "prompt/topic required" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ message: "GEMINI_API_KEY missing in Vercel env" });

    // Daha uygun kota: flash
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

    return res.status(200).json({ ok: true, result: text });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
}
