// client/src/app/.well-known/farcaster.json/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function GET() {
  const filePath = join(process.cwd(), 'public', '.well-known', 'farcaster.json');
  const body = await readFile(filePath, 'utf8');

  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-cache, no-store, must-revalidate',
    },
  });
}
