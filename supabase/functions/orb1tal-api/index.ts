// ORB1TAL API: shared game statuses and order, stored in a Supabase table.
// Deploy with: npx supabase functions deploy orb1tal-api --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD') ?? '';
const ALLOWED_STATUSES = ['up', 'unstable', 'very-unstable', 'down'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAdmin(req: Request) {
  return !!ADMIN_PASSWORD && safeEqual(req.headers.get('X-Admin-Password') ?? '', ADMIN_PASSWORD);
}

function parseJSON(text: string | undefined, fallback: any) {
  try {
    const value = JSON.parse(text ?? '');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

// Only accept well-formed data so the stored state stays predictable.
function clean(body: any) {
  const statuses: Record<string, { status: string; statusLabel: string }> = {};
  if (body?.statuses && typeof body.statuses === 'object') {
    for (const [id, value] of Object.entries<any>(body.statuses)) {
      if (id.length <= 60 && value && ALLOWED_STATUSES.includes(value.status)) {
        statuses[id] = {
          status: value.status,
          statusLabel: String(value.statusLabel || value.status).slice(0, 40)
        };
      }
    }
  }
  const order: string[] = Array.isArray(body?.order)
    ? body.order.filter((id: unknown) => typeof id === 'string' && id.length <= 60).slice(0, 100)
    : [];
  return { statuses, order };
}

async function getState() {
  const { data, error } = await supabase.from('kv').select('key, value');
  if (error) return json({ error: 'Database error' }, 500);
  const map = Object.fromEntries((data ?? []).map((row: any) => [row.key, row.value]));
  return json({
    statuses: parseJSON(map.statuses, {}),
    order: parseJSON(map.order, [])
  });
}

async function putState(req: Request) {
  if (!isAdmin(req)) return json({ error: 'Unauthorized' }, 401);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const data = clean(body);
  const { error } = await supabase.from('kv').upsert([
    { key: 'statuses', value: JSON.stringify(data.statuses) },
    { key: 'order', value: JSON.stringify(data.order) }
  ]);
  if (error) return json({ error: 'Database error' }, 500);
  return json({ ok: true });
}

async function login(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false }, 400);
  }
  const ok = !!ADMIN_PASSWORD && typeof body?.password === 'string' &&
    safeEqual(body.password, ADMIN_PASSWORD);
  return json({ ok }, ok ? 200 : 401);
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const path = new URL(req.url).pathname;
  if (path.endsWith('/state') && req.method === 'GET') return getState();
  if (path.endsWith('/state') && req.method === 'PUT') return putState(req);
  if (path.endsWith('/login') && req.method === 'POST') return login(req);
  return json({ error: 'Not found' }, 404);
});
