// 🔑 E2E من واجهة المستخدم نفسها (١٤/٩ — محمد: «جرّب انت تسجل دخول من صفحات اليوزر»):
// حساب اختبار (زي اللي بيتعمل من /start: واتساب + باسورد + شركة) → /login في متصفح حقيقي → الرقم + الباسورد → Enter → الوجهة.
// بعدها الإيميل + الباسورد، وباسورد غلط لازم يطلّع رسالة. الحساب بيتمسح في الآخر.
const fs = require('fs'); const path = require('path');
const env = Object.fromEntries(fs.readFileSync(path.join(__dirname, '../../../.env.local'), 'utf8').split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PHONE = '01999888794', PW = 'UiPass-' + Date.now(), EMAIL = '20' + PHONE.slice(1) + '@madmonacairo.com', LOGIN_EMAIL = 'e2e.ui.' + Date.now() + '@madmonacairo.com';
const BASE = 'https://www.madmonacairo.com';
(async () => {
  const out = {};
  const a = await db.auth.admin.createUser({ email: EMAIL, phone: '+20' + PHONE.slice(1), password: PW, email_confirm: true, phone_confirm: true, user_metadata: { full_name: 'E2E UI', login_email: LOGIN_EMAIL } });
  if (a.error) { console.log('createUser failed', a.error.message); process.exit(1); }
  const uid = a.data.user.id;
  await db.from('profiles').upsert({ id: uid, phone: '+20' + PHONE.slice(1), full_name: 'E2E UI', email: LOGIN_EMAIL }, { onConflict: 'id' });
  const cb = await db.rpc('self_create_business', { p_user: uid, p_payload: { business_name: 'E2E شركة واجهة', contact_phone: PHONE, contact_email: LOGIN_EMAIL, contact_name: 'E2E', city: 'القاهرة', industry: 'clinic' } });
  const sid = cb.data && cb.data.supplier_id; out.business = cb.error ? cb.error.message : !!sid;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const tryLogin = async (identifier, password) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-EG' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 80)));
    await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('input[autocomplete="username"]', { timeout: 30000 });
    await p.fill('input[autocomplete="username"]', identifier);
    await p.fill('input[type="password"]', password);
    await p.keyboard.press('Enter');
    let url = '';
    try { await p.waitForURL(u => !/\/login/.test(String(u)), { timeout: 25000 }); url = p.url(); } catch { url = p.url(); }
    await p.waitForTimeout(4000);
    const text = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 400);
    const errMsg = await p.evaluate(() => (document.querySelector('p.text-red-600') || {}).innerText || '');
    const hasSession = await p.evaluate(() => Object.keys(localStorage).some(k => /sb-.*auth-token/.test(k)));
    await ctx.close();
    return { landed: url.replace(BASE, ''), hasSupabaseSession: hasSession, err: errMsg, sawBusiness: /E2E شركة واجهة|كمّل شركتك|لوحة/.test(text), pageErrors: errs.slice(0, 2) };
  };
  out.byPhone = await tryLogin(PHONE, PW);
  out.byEmail = await tryLogin(LOGIN_EMAIL, PW);
  out.wrongPw = await tryLogin(PHONE, PW + 'x');
  await browser.close();
  console.log(JSON.stringify(out));
  if (sid) { await db.from('business_employees').delete().eq('supplier_id', sid); await db.from('suppliers').delete().eq('id', sid); await db.from('marketplace_suppliers').delete().eq('id', sid); }
  await db.from('madmona_sessions').delete().in('account_id', (await db.from('madmona_accounts').select('id').eq('profile_id', uid)).data?.map(x => x.id) || ['00000000-0000-0000-0000-000000000000']);
  await db.from('madmona_accounts').delete().eq('profile_id', uid);
  await db.from('profiles').delete().eq('id', uid);
  const d = await db.auth.admin.deleteUser(uid);
  console.log('cleanup', d.error ? d.error.message : '✓', 'supplier', sid || '-');
})();
