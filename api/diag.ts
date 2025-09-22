// api/diag.ts
export default async function handler(_req: any, res: any) {
  try {
    const mod = await import("../server/app");        // <-- asıl şüpheli nokta
    const keys = Object.keys(mod || {});
    res.status(200).json({ ok: true, loaded: true, keys });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      error: err?.message ?? String(err),
      stack: String(err?.stack || "").slice(0, 2000)
    });
  }
}
