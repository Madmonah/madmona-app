// reset-admin-pass.mjs — يغيّر باسوورد حساب الأدمن/المالك
// التشغيل:  node reset-admin-pass.mjs "الباسوورد_الجديد"
// الباسوورد بيتبعت كـ argument فبيفضل على جهازك بس.

import { readFileSync } from 'node:fs';

const NEW_PASSWORD = process.argv[2];
if (!NEW_PASSWORD) {
  console.error('❌ اكتب الباسوورد الجديد:  node reset-admin-pass.mjs "PasswordHere"');
  process.exit(1);
}
if (NEW_PASSWORD.length < 8) {
  console.error('❌ الباسوورد لازم 8 حروف على الأقل.');
  process.exit(1);
}

// قراءة المفتاح من .env.local بأي اسم متعارف عليه
let key = '';
try {
  const env = readFileSync('.env.local', 'utf8');
  for (const name of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE']) {
    const m = env.match(new RegExp('^\\s*' + name + '\\s*=\\s*"?([^"\\r\\n]+)"?', 'm'));
    if (m) { key = m[1].trim(); break; }
  }
} catch {
  console.error('❌ مش لاقي .env.local — اتأكد إنك في فولدر C:\\madmona-app');
  process.exit(1);
}
if (!key) {
  console.error('❌ مش لاقي الـ SERVICE_ROLE_KEY في .env.local');
  process.exit(1);
}

const ADMIN_ID = '147cd904-3228-401c-8b5f-79f43d6d081f';
const URL = 'https://mjhflxpxunwycbiquoig.supabase.co/auth/v1/admin/users/' + ADMIN_ID;

const res = await fetch(URL, {
  method: 'PUT',
  headers: {
    apikey: key,
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ password: NEW_PASSWORD }),
});

const body = await res.text();
if (res.ok) {
  console.log('✅ الباسوورد اتغير بنجاح.');
  console.log('⚠️ السيشنز القديمة لسه شغالة — قول لـ Claude "اعمل" عشان نلغّيها.');
} else {
  console.log('❌ فشل (status ' + res.status + '):');
  console.log(body);
}
