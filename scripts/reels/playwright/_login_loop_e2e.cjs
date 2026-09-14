// 🔁 E2E (١٤/٩): حلقة /login?next=/admin/business-partners — صاحب بيزنس (بباسورد) بيدخل من اللينك ده لازم يوصل لوحته مش يرجع /login.
// + bare /admin/business-finance وهو داخل → /account مش /login. الحساب بيتمسح بعدها.
const fs = require('fs'); const path = require('path');
const env = Object.fromEntries(fs.readFileSync(path.join(__dirname, '../../../.env.local'), 'utf8').split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PHONE = '01999888795', PW = 'LoopPass-' + Date.now(), EMAIL = '20' + PHONE.slice(1) + '@madmonacairo.com';
const BASE = 'https://www.madmonacairo.com';
(async () => {
  const out = {};
  const a = await db.auth.admin.createUser({ email: EMAIL, phone: '+20' + PHONE.slice(1), password: PW, email_confirm: true, phone_confirm: true, user_metadata: { full_name: 'E2E Loop' } });
  if (a.error) { console.log('createUser failed', a.error.message); process.exit(1); }
  const uid = a.data.user.id;
  await db.from('profiles').upsert({ id: uid, phone: '+20' + PHONE.slice(1), full_name: 'E2E Loop' }, { onConflict: 'id' });
  const cb = await db.rpc('self_create_business', { p_user: uid, p_payload: { business_name: 'E2E شركة الحلقة', contact_phone: PHONE, contact_name: 'E2E', city: 'القاهرة', industry: 'clinic' } });
  const sid = cb.data && cb.data.supplier_id; out.business = !!sid;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-EG' });
  const p = await ctx.newPage();
  // ١) نفس اللينك اللي محمد لفّ عليه ٩ مرات
  await p.goto(BASE + '/login?next=%2Fadmin%2Fbusiness-partners', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('input[autocomplete="username"]', { timeout: 30000 });
  await p.fill('input[autocomplete="username"]', PHONE); await p.fill('input[type="password"]', PW); await p.keyboard.press('Enter');
  try { await p.waitForURL(u => !/\/login/.test(String(u)), { timeout: 25000 }); } catch {}
  await p.waitForTimeout(5000);
  out.afterLogin = p.url().replace(BASE, '');
  out.stillOnLogin = /\/login/.test(p.url());
  // ٢) وهو داخل: bare /admin/business-finance (اللي كان بيحوّل لصفحة الأدمن)
  await p.goto(BASE + '/admin/business-finance', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000);
  out.bareFinance = p.url().replace(BASE, '');
  // ٣) وهو داخل: /login نفسها لازم تحوّله لوحده (جلسة Supabase من غير توكن)
  await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(7000);
  out.loginWhileIn = p.url().replace(BASE, '');
  // ٤) /admin/business-partners مباشرة وهو داخل (الميدلوير → /login?next → الصفحة تحوّله للوحته)
  await p.goto(BASE + '/admin/business-partners', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(8000);
  out.partnersWhileIn = p.url().replace(BASE, '');
  await browser.close();
  console.log(JSON.stringify(out));
  if (sid) { await db.from('business_employees').delete().eq('supplier_id', sid); await db.from('suppliers').delete().eq('id', sid); await db.from('marketplace_suppliers').delete().eq('id', sid); }
  const accs = (await db.from('madmona_accounts').select('id').eq('profile_id', uid)).data || [];
  if (accs.length) { await db.from('madmona_sessions').delete().in('account_id', accs.map(x => x.id)); await db.from('madmona_accounts').delete().eq('profile_id', uid); }
  await db.from('profiles').delete().eq('id', uid);
  const d = await db.auth.admin.deleteUser(uid);
  console.log('cleanup', d.error ? d.error.message : '✓', 'supplier', sid || '-');
})();
