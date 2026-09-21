// 🔧 (٢١/٩/٢٠٢٦) محمد: «اعمل بروفايل لكل واحد فيهم وخليهم ينشروا».
//
// العطل: `listings.supplier_id` عليه FK على **marketplace_suppliers**، بينما
// `admin_create_b2b_partner_unguarded` (ومنها `self_create_business` بتاعة /start)
// بتعمل صف في **suppliers** بس. فـ١١ مورد — فيهم عملاء حقيقيين — أي إعلان منهم
// بيرجّع `violates foreign key constraint listings_supplier_id_fkey`.
//
// الحل هنا: لكل مورد ناقص → مستخدم تقني (من غير باسورد) + بروفايل + صف في جدول السوق.
// ⚠️ الرقم في البروفايل = `partner:<supplier_id>` مش رقم تليفون:
//    أغلبهم رقمهم رقم مضمونة العام (01002229982)، وقاعدة ٢٥/٨ بتمنع دخوله في أي منطق
//    ملكية (`is_platform_public_phone`) — كده كنا هنرمي أصولهم على حساب محمد الشخصي.
//    ولو صاحب البيزنس سجّل بنفسه بعدين، حسابه الحقيقي بيتربط وده يفضل مالك تقني.
// ⛔ مفيش أي باسورد بيتولّد أو يتخزّن (خط أحمر).
//
// التشغيل: node scripts/clients/fix-missing-marketplace-suppliers.cjs [--apply]
const fs = require('fs'), path = require('path')
const { createClient } = require('@supabase/supabase-js')
const env = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8')
const pick = (k) => (env.match(new RegExp('^' + k + '="?([^"\\n\\r]+)', 'm')) || [])[1]
const db = createClient(pick('NEXT_PUBLIC_SUPABASE_URL'), pick('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
const APPLY = process.argv.includes('--apply')

;(async () => {
  const { data: sup, error } = await db.from('suppliers').select('id, business_name, contact_name, contact_phone')
  if (error) throw new Error(error.message)
  const { data: mkt } = await db.from('marketplace_suppliers').select('id')
  const have = new Set((mkt || []).map((m) => m.id))
  const missing = (sup || []).filter((s) => !have.has(s.id))

  console.log(`الموردين الناقصين: ${missing.length}\n`)
  if (!APPLY) { missing.forEach((m) => console.log(' •', m.business_name)); console.log('\n(تشغيل تجريبي — ضيف --apply للتنفيذ)'); return }

  let ok = 0
  for (const s of missing) {
    try {
      const email = `partner-${s.id}@partners.madmonacairo.com`
      // مستخدم تقني من غير باسورد — نفس نمط حساب الواتساب في /start
      let userId
      const { data: made, error: mkErr } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { partner_supplier: s.id } })
      if (mkErr) {
        if (!/already|exists|registered/i.test(mkErr.message)) throw new Error('createUser: ' + mkErr.message)
        const { data: list } = await db.auth.admin.listUsers({ perPage: 200 })
        userId = (list?.users || []).find((u) => u.email === email)?.id
        if (!userId) throw new Error('المستخدم موجود بس مالقيتوش')
      } else userId = made.user.id

      // البروفايل (id = نفس المستخدم — FK على auth.users)
      const { error: pErr } = await db.from('profiles').upsert({
        id: userId, phone: `partner:${s.id}`,
        full_name: s.contact_name || s.business_name, role: 'supplier',
      }, { onConflict: 'id' })
      if (pErr) throw new Error('profile: ' + pErr.message)

      const { error: mErr } = await db.from('marketplace_suppliers').insert({
        id: s.id, profile_id: userId, business_name: s.business_name,
        kyc_status: 'approved', account_type: 'business', country: 'EG', currency: 'EGP',
      })
      if (mErr) throw new Error('marketplace: ' + mErr.message)
      console.log('✅', s.business_name); ok++
    } catch (e) {
      console.log('❌', s.business_name, '—', e.message.slice(0, 120))
    }
  }
  console.log(`\nاتظبط: ${ok} من ${missing.length}`)
})().catch((e) => { console.error('❌', e.message); process.exit(1) })
