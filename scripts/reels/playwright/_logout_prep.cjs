// يعمل/يمسح مستخدم Supabase لرقم الاختبار 01999888779 (للإثبات بس — بيتمسح بعدها)
// node scripts/reels/playwright/_logout_prep.cjs create|delete
const fs = require('fs'); const path = require('path');
const env = Object.fromEntries(fs.readFileSync(path.join(__dirname, '../../../.env.vercel-prod'), 'utf8')
  .split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }));
const { createClient } = require('@supabase/supabase-js');
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjhflxpxunwycbiquoig.supabase.co', env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const EMAIL = '201999888779@madmonacairo.com';
(async () => {
  const mode = process.argv[2] || 'create';
  if (mode === 'create') {
    const { data, error } = await db.auth.admin.createUser({ email: EMAIL, phone: '+201999888779', email_confirm: true, phone_confirm: true, user_metadata: { full_name: 'اختبار خروج (يتمسح)' } });
    console.log(JSON.stringify({ created: !!data?.user, id: data?.user?.id || null, error: error?.message || null }));
  } else {
    const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
    const u = (data?.users || []).find(x => x.email === EMAIL);
    console.log(JSON.stringify({ found: !!u, id: u?.id || null }));
  }
})();
