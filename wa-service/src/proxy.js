// IP مستقل لكل رقم
// ═══════════════════════════════════════════════════════════════════════
//
// السؤال اللي اتكرر كتير: «ليه الأرقام كلها طالعة من نفس الـIP؟»
//
// السبب إن الجهاز المرتبط بيتصل بواتساب **من السيرفر مش من الموبايل**.
// الموبايل بيمسح الـQR مرة واحدة ويسلّم المفاتيح وخلاص؛ بعد كده السوكيت
// بيفضل مفتوح من الكونتينر طول اليوم. فكل الأرقام اللي على نفس الكونتينر
// بتخرج من نفس العنوان — رايلواي بيدي IP واحد للكونتينر، ومشاريع منفصلة
// مابتغيرش ده لأن الخروج بيعدّي من نفس NAT المنطقة.
//
// الملف ده بيدي كل جلسة قناة خروج خاصة بيها. طريقتين مدعومتين:
//
//   ١) بروكسي   →  http://user:pass@host:port
//                  https://…  ·  socks5://…  ·  socks4://…
//      كل رقم بيطلع من IP البروكسي بتاعه. بيشتغل في أي مكان — رايلواي،
//      VPS، أي حتة. ده الحل الوحيد لو عايز الـIP يبان **مصري**.
//
//   ٢) ربط عنوان محلي  →  bind://203.0.113.7
//      لو السيرفر عنده أكتر من IPv4 (VPS بعناوين إضافية)، كل جلسة
//      بتتربط بعنوان منهم. مفيش طرف تالت ومفيش اشتراك شهري —
//      بس بيتطلب سيرفر بعناوين حقيقية، مايشتغلش على رايلواي.
//
// ⚠️ فرق مهم لازم يكون واضح:
//    عناوين داتا سنتر منفصلة = **عزل** (رقم يتحظر مايجرّش الباقي معاه).
//    بروكسي موبايل/ريزيدنشال مصري = **تمويه** (بيقلل احتمال الحظر نفسه).
//    الاتنين مش نفس الحاجة، والأول مابيغنيش عن التاني.
//
// ── مصدر الإعداد (بالأولوية) ─────────────────────────────────────────
//   ١. ملف  <AUTH_DIR>/<session>/proxy.txt   ← بيتكتب من لوحة الأدمن
//   ٢. متغير PROXY_<session>                  ← مثال PROXY_201002229982
//   ٣. متغير PROXY_DEFAULT                    ← لكل الأرقام اللي مالهاش
//
// الملف مخزّن جوّه الـvolume مع مفاتيح الجلسة، فبيعيش بعد أي نشر جديد —
// وده المقصود: تضيف رقم وتحطله بروكسي من اللوحة من غير ما تنشر تاني.

import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { Agent as HttpsAgent } from 'node:https'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'

const FILE = 'proxy.txt'

/** مسار ملف البروكسي بتاع جلسة */
function proxyPath(authRoot, id) {
  return join(authRoot, id, FILE)
}

/**
 * الإعداد الفعّال للجلسة دي.
 * بيرجّع سترينج زي `socks5://…` أو `bind://…` أو '' لو مفيش.
 */
export function resolveProxy(authRoot, id) {
  try {
    const p = proxyPath(authRoot, id)
    if (existsSync(p)) {
      const v = readFileSync(p, 'utf8').trim()
      if (v) return v
    }
  } catch { /* نكمّل على المتغيرات */ }

  // المتغيرات مابتقبلش رموز غير الحروف والأرقام و_ — فبنشيل أي حاجة تانية
  const key = `PROXY_${String(id).replace(/[^A-Za-z0-9_]/g, '')}`
  return (process.env[key] || process.env.PROXY_DEFAULT || '').trim()
}

/** حفظ/مسح بروكسي جلسة. القيمة الفاضية = رجوع لـIP السيرفر. */
export function saveProxy(authRoot, id, value) {
  const dir = join(authRoot, id)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const p = proxyPath(authRoot, id)
  const v = String(value || '').trim()
  if (!v) {
    if (existsSync(p)) rmSync(p, { force: true })
    return ''
  }
  assertValid(v)
  writeFileSync(p, v, 'utf8')
  return v
}

/**
 * تحقق مبكّر — أحسن ما نكتشف الغلط وقت الاتصال ونفضل نلفّ.
 * بيرمي Error برسالة عربية واضحة.
 */
export function assertValid(value) {
  const v = String(value || '').trim()
  if (!v) return
  let u
  try {
    u = new URL(v)
  } catch {
    throw new Error('صيغة غلط — لازم تبدأ بـ http:// أو socks5:// أو bind://')
  }
  const scheme = u.protocol.replace(':', '')
  if (!['http', 'https', 'socks', 'socks4', 'socks5', 'bind'].includes(scheme)) {
    throw new Error(`نوع مش مدعوم: ${scheme} — المدعوم: http · https · socks4 · socks5 · bind`)
  }
  if (scheme === 'bind') {
    // bind://203.0.113.7 — الاستضافة هي العنوان نفسه
    const ip = u.hostname
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip) && !ip.includes(':')) {
      throw new Error('bind:// لازم يكون بعدها عنوان IP بتاع السيرفر نفسه')
    }
  } else if (!u.hostname || !u.port) {
    throw new Error('البروكسي لازم يكون فيه استضافة وبورت — مثال socks5://user:pass@1.2.3.4:1080')
  }
}

/**
 * الـagent اللي بيتبعت لـBaileys.
 * بيرجّع undefined لو مفيش إعداد — ووقتها بيستخدم IP السيرفر عادي.
 *
 * ⚠️ مابيرميش أبدًا. بروكسي بايظ = تحذير في اللوج ورجوع لـIP السيرفر،
 *    لأن رقم شغال من IP غلط أحسن من رقم واقع.
 */
export function buildAgent(value, log) {
  const v = String(value || '').trim()
  if (!v) return undefined
  try {
    if (v.startsWith('bind://')) {
      const localAddress = new URL(v).hostname
      return new HttpsAgent({ localAddress, keepAlive: true })
    }
    if (v.startsWith('socks')) return new SocksProxyAgent(v)
    return new HttpsProxyAgent(v)
  } catch (e) {
    log?.error({ err: e.message, proxy: mask(v) }, '⚠️ بروكسي بايظ — بنكمّل على IP السيرفر')
    return undefined
  }
}

/**
 * إخفاء اليوزر والباسورد قبل أي عرض أو لوج.
 * بيانات البروكسي زي أي سر — ماتظهرش في لوحة ولا لوج ولا رد API.
 *   socks5://ali:s3cr3t@1.2.3.4:1080  →  socks5://***@1.2.3.4:1080
 */
export function mask(value) {
  const v = String(value || '').trim()
  if (!v) return ''
  try {
    const u = new URL(v)
    if (u.username || u.password) {
      u.username = '***'
      u.password = ''
    }
    return u.toString().replace(/\/$/, '')
  } catch {
    return '***'
  }
}
