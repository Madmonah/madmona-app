// wa_cloud_check.mjs — يقرأ التوكن الدائم محلياً ويستعلم Meta عن أرقام الـ WABA
import fs from 'fs';

// اقرأ مفاتيح Supabase من .env.local
const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
};
const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

// اجلب إعدادات الـ Cloud API من whatsapp_config
async function getConfig(keys) {
  const url = `${SUPABASE_URL}/rest/v1/whatsapp_config?key=in.(${keys.join(',')})&select=key,value`;
  const r = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  });
  const rows = await r.json();
  const out = {};
  for (const row of rows) out[row.key] = row.value;
  return out;
}

const cfg = await getConfig(['access_token', 'waba_id', 'business_id', 'app_id', 'phone_number_id', 'token_expires_at']);
const TOKEN = cfg.access_token;
const WABA = cfg.waba_id;

console.log('=== إعدادات الـ Cloud API ===');
console.log('WABA ID:', WABA);
console.log('Business ID:', cfg.business_id);
console.log('App ID:', cfg.app_id);
console.log('التوكن: [' + (TOKEN ? TOKEN.length + ' حرف - موجود' : 'غير موجود') + ']');
console.log('انتهاء التوكن:', cfg.token_expires_at || 'دائم');

// استعلم Meta عن الأرقام الموجودة على الـ WABA
console.log('\n=== الأرقام الموجودة حالياً على الـ WABA ===');
const gr = await fetch(`https://graph.facebook.com/v21.0/${WABA}/phone_numbers?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,throughput&access_token=${TOKEN}`);
const gj = await gr.json();
if (gj.error) {
  console.log('خطأ من Meta:', JSON.stringify(gj.error, null, 2));
} else {
  for (const p of (gj.data || [])) {
    console.log(`  📱 ${p.display_phone_number} | id=${p.id} | الاسم="${p.verified_name}" | تحقق=${p.code_verification_status} | جودة=${p.quality_rating || '-'}`);
  }
  console.log(`\n  الإجمالي: ${(gj.data || []).length} رقم`);
}
