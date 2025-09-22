export function pickText(d: any): string {
  return (d?.text || d?.content || d?.result || d?.message || "").toString();
}
