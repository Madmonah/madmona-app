// ⬆️ ينزّل الصور الأصلية ويرفعها على Supabase ويربطها كـ cover
const fs = require('fs');
const path = require('path');
const S = 'E:\\madmona-app\\scripts\\';

// بيقرا المفاتيح من .env.local
const env = {};
try {
  fs.readFileSync(path.join(S, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch { /* ignore */ }

const SUPA = env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!SUPA || !KEY) { console.log('⛔ مفيش مفاتيح Supabase في .env.local'); process.exit(1); }
console.log('SUPABASE:', SUPA);

const SRC = process.argv[2] || 'picks.json';
const rows = JSON.parse(fs.readFileSync(S + SRC, 'utf8'))
  .filter(r => r.pick)
  .map(r => ({ id: r.id, title: r.title, hires: r.pick }));
console.log('TO UPLOAD:', rows.length, 'from', SRC);

const slug = s => (s || 'proj').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

(async () => {
  let ok = 0, fail = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const res = await fetch(r.hires, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.google.com/' },
      });
      if (!res.ok) throw new Error('fetch ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 15000) throw new Error('too small ' + buf.length);

      const ct = res.headers.get('content-type') || 'image/jpeg';
      const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
      const key = `projects/${slug(r.title)}-${r.id.slice(0, 8)}.${ext}`;

      const up = await fetch(`${SUPA}/storage/v1/object/project-media/${key}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KEY}`,
          'Content-Type': ct,
          'x-upsert': 'true',
        },
        body: buf,
      });
      if (!up.ok) throw new Error('upload ' + up.status + ' ' + (await up.text()).slice(0, 80));

      const url = `${SUPA}/storage/v1/object/public/project-media/${key}`;

      const patch = await fetch(`${SUPA}/rest/v1/property_market_items?id=eq.${r.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${KEY}`,
          apikey: KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ cover_url: url, media: [url], updated_at: new Date().toISOString() }),
      });
      if (!patch.ok) throw new Error('patch ' + patch.status);

      ok++;
      console.log(`${i + 1}/${rows.length} ✅ ${r.title} · ${Math.round(buf.length / 1024)}KB`);
    } catch (e) {
      fail++;
      console.log(`${i + 1}/${rows.length} ❌ ${r.title}: ${String(e.message).slice(0, 60)}`);
    }
  }
  console.log(`\nDONE ok=${ok} fail=${fail}`);
})();
