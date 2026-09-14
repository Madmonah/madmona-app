// 🔑🔑 E2E (١٤/٩): نفس الرقم بحسابين (واتساب + «جوجل») — الباسورد على حساب جوجل بس → /api/login بالرقم لازم يدخل على حساب جوجل. بيتمسح كله بعدها.
const fs = require('fs'); const path = require('path');
const env = Object.fromEntries(fs.readFileSync(path.join(__dirname, '../../../.env.local'), 'utf8').split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const { createClient } = require('@supabase/supabase-js');
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PHONE = '01999888793', PW_WA = 'WaPass-' + Date.now(), PW_G = 'GoPass-' + Date.now();
const EMAIL_WA = '20' + PHONE.slice(1) + '@madmonacairo.com', EMAIL_G = 'e2e.google.' + Date.now() + '@madmonacairo.com';
const login = (identifier, password) => fetch('https://www.madmonacairo.com/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier, password }) }).then(x => x.json()).catch(e => ({ err: e.message }));
const who = async (at) => { if (!at) return null; const { data } = await db.auth.getUser(at); return data?.user?.email || null; };
(async () => {
  const out = {};
  // ١) حساب واتساب (زي اللي بيتعمل من التوثيق) — باسورد عشوائي مش معروف للمستخدم
  const a = await db.auth.admin.createUser({ email: EMAIL_WA, phone: '+20' + PHONE.slice(1), password: PW_WA, email_confirm: true, phone_confirm: true, user_metadata: { full_name: 'E2E WA' } });
  if (a.error) { console.log('createUser WA failed', a.error.message); process.exit(1); }
  // ٢) حساب «جوجل» — إيميل من غير رقم، بروفايله oauth:
  const g = await db.auth.admin.createUser({ email: EMAIL_G, email_confirm: true, user_metadata: { full_name: 'E2E Google' } });
  if (g.error) { console.log('createUser G failed', g.error.message); process.exit(1); }
  const uidA = a.data.user.id, uidG = g.data.user.id;
  await db.from('profiles').upsert({ id: uidA, phone: '+20' + PHONE.slice(1), full_name: 'E2E WA' }, { onConflict: 'id' });
  await db.from('profiles').upsert({ id: uidG, phone: 'oauth:' + uidG, full_name: 'E2E Google', email: EMAIL_G }, { onConflict: 'id' });
  // ٣) نفس اللي /start بيعمله لحساب جوجل: باسورد + شركة برقم الواتساب
  const up = await db.auth.admin.updateUserById(uidG, { password: PW_G });
  out.setPw = up.error ? up.error.message : 'ok';
  const cb = await db.rpc('self_create_business', { p_user: uidG, p_payload: { business_name: 'E2E شركة اختبار جوجل', contact_phone: PHONE, contact_name: 'E2E', city: 'القاهرة', industry: 'clinic' } });
  out.business = cb.error ? cb.error.message : (cb.data && cb.data.ok);
  // ٤) الدخول بالرقم + باسورد جوجل → لازم يدخل على حساب جوجل (مش الواتساب)
  const r1 = await login(PHONE, PW_G); out.byPhone_googlePw = { ok: r1.ok, source: r1.source, user: await who(r1.access_token) };
  const r2 = await login(PHONE, PW_WA); out.byPhone_waPw = { ok: r2.ok, user: await who(r2.access_token) };
  const r3 = await login(EMAIL_G, PW_G); out.byEmail = { ok: r3.ok, user: await who(r3.access_token) };
  const r4 = await login(PHONE, 'wrong-' + PW_G); out.wrongPw = r4.ok;
  console.log(JSON.stringify(out));
  // ٥) تنضيف
  const sid = cb.data && cb.data.supplier_id;
  if (sid) { await db.from('business_employees').delete().eq('supplier_id', sid); await db.from('suppliers').delete().eq('id', sid); await db.from('marketplace_suppliers').delete().eq('id', sid); }
  await db.from('madmona_accounts').delete().in('profile_id', [uidA, uidG]).then(() => {}, () => {});
  await db.from('profiles').delete().in('id', [uidA, uidG]);
  const d1 = await db.auth.admin.deleteUser(uidA); const d2 = await db.auth.admin.deleteUser(uidG);
  console.log('cleanup', d1.error ? d1.error.message : 'A✓', d2.error ? d2.error.message : 'G✓', 'supplier', sid || '-');
})();
