'use client'
// ============================================================================
// 🏗️ /expo — صفحة العارضين (معرض مواد البناء)
//
// (٣ سبتمبر ٢٠٢٦) محمد: «عايزين نبعت للناس اللي هتشارك نبذة تعريفية عن
//   مضمونة ونشتغل قبل المعرض مع العارضين» + «عايزين نعمل فورم بالإيميل
//   كمان — أكتر احترافية في التعامل مع الشركات».
//
// ⚠️ وضعية مهمة (محمد نصًا): «وضّح إن نظام الإدارة خاص بمديرين المبيعات،
//    علشان أغلب الشركات عندها نظام إدارة بالفعل». يعني ممنوع نبيعها
//    كبديل للـERP بتاعهم — دي لوحة للطلبات والاستفسارات الجاية من
//    مضمونة، وبتقعد جنب نظامهم مش مكانه.
//
// ⚠️ كل رقم في الصفحة دي متقاس من الداتابيز — خط أحمر: «ممنوع تخترع
//    سعر أو نسبة أو إحصائية في أي حاجة بتروح لعميل».
// ============================================================================
import { useState } from 'react'
import Link from 'next/link'

const INK = '#0E2A20', INK2 = '#3A5147', MUTED = '#78857D'
const PAPER = '#F7F5F0', CARD = '#FFFFFF', LINE = '#DFDACF'
const MINT = '#0C7A50', MINT_SOFT = '#E4F1EA', STEEL = '#5A6B72'

const CATS = [
  'أسمنت ومونة', 'حديد ومعادن', 'خرسانة وطوب', 'سيراميك وبورسلين',
  'رخام وجرانيت', 'دهانات وعوازل', 'جبس وأسقف', 'ألومنيوم وزجاج',
  'أخشاب وأبواب', 'أدوات صحية', 'كهرباء وإضاءة', 'معدات وعدد',
]
const ROLES = [
  { k: 'factory', l: 'مصنع' },
  { k: 'importer', l: 'مستورد' },
  { k: 'distributor', l: 'موزّع معتمد' },
  { k: 'wholesaler', l: 'تاجر جملة' },
]

export default function ExpoPage() {
  const [f, setF] = useState({
    company_name: '', contact_name: '', email: '', phone: '',
    website: '', booth: '', supplier_role: '', message: '',
  })
  const [cats, setCats] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  // ⚠️ (٣ سبتمبر ٢٠٢٦) ممنوع نقول للعميل «بعتنالك إيميل» غير لما يكون
  //    اتبعت فعلًا. الـAPI بيرجّع emailed، والرسالة بتتغيّر على أساسه —
  //    اتكشف إن مفتاح Resend راجع 401، وكانت الشاشة هتكدب على العميل.
  const [emailed, setEmailed] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function set(k: keyof typeof f, v: string) { setF((s) => ({ ...s, [k]: v })) }
  function toggleCat(c: string) {
    setCats((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!f.company_name.trim()) { setErr('اكتب اسم الشركة'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) { setErr('الإيميل مش مظبوط'); return }
    setBusy(true)
    try {
      const r = await fetch('/api/expo/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, categories: cats }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok) { setErr(j?.error || 'مش قادرين نسجّل الطلب دلوقتي'); setBusy(false); return }
      setEmailed(!!j.emailed)
      setDone(true)
    } catch {
      setErr('مش قادرين نوصل للسيرفر دلوقتي، جرّب تاني')
    }
    setBusy(false)
  }

  const input: React.CSSProperties = {
    width: '100%', border: `1px solid ${LINE}`, borderRadius: 10, padding: '11px 13px',
    fontSize: 16, background: CARD, color: INK, fontFamily: 'inherit',
  }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: INK2, marginBottom: 5 }

  return (
    <div dir="rtl" style={{ background: PAPER, color: INK, minHeight: '100vh', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '30px 18px 80px' }}>

        {/* ═══ ترويسة ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none', color: INK }}>
            <p style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-.01em' }}>مضمونة</p>
            <p style={{ margin: '-2px 0 0', fontSize: 10, letterSpacing: '.24em', color: MUTED }}>MADMONA</p>
          </Link>
          <span style={{
            fontSize: 11.5, fontWeight: 700, color: MINT, background: MINT_SOFT,
            borderRadius: 999, padding: '5px 13px', border: `1px solid ${MINT}33`,
          }}>لعارضي معرض مواد البناء</span>
        </div>

        {/* ═══ العنوان ═══ */}
        <div style={{ marginTop: 28, paddingBottom: 26, borderBottom: `2px solid ${INK}` }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(25px,5.2vw,35px)', fontWeight: 800, lineHeight: 1.3, letterSpacing: '-.02em' }}>
            منتجاتك تفضل معروضة بعد ما المعرض يقفل.
          </h1>
          <p style={{ margin: '14px 0 0', fontSize: 16.5, lineHeight: 1.75, color: INK2, maxWidth: '56ch' }}>
            مضمونة سوق مصري للجملة والخدمات، و<b style={{ color: INK }}>وسيط ضامن بين البايع والمشتري</b> —
            إحنا مش بنشتري منك ولا بنبيع بدالك. بنعرض منتجاتك، بنوصّلك بالمشتري،
            وبنقف في النص لحد ما الطرفين ياخدوا حقهم.
          </p>
        </div>

        {/* ═══ الخدمات ═══ */}
        <Kicker>الخدمات اللي بتاخدها الشركة</Kicker>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 12 }}>
          <Svc t="صفحة شركة بلينك"
               d="لوجو وعنوان وتليفون وكتالوج منتجاتك بأسعارها ووحداتها — لينك واحد تبعته لأي عميل." />
          <Svc t="إدخال الكتالوج بالنيابة"
               d="ابعت الـPDF أو الصور وفريقنا بيحوّلها لمنتجات بمواصفاتها. مش محتاج تدخّل حاجة بنفسك." />
          <Svc t="مواصفات جملة حقيقية"
               d="وحدة البيع، أقل كمية للطلب، بلد المنشأ، مدة التوريد، التوصيل — اللي المشتري بيقارن بيه فعلاً." />
          <Svc t="الترجمة والوصول"
               d="كل منتج بيتترجم للإنجليزي تلقائي، والموقع بسبع لغات — للمشتري العربي والأجنبي." />
          <Svc t="الوساطة المضمونة"
               d="الاستفسار بيفتح محادثة بين الطرفين ومضمونة في النص، وبنفضل معاكم لحد ما الاتفاق يتم." />
          <Svc t="التسويق والعرض"
               d="منتجاتك بتدخل السوق وصفحات الأقسام، وبنسوّقلها على قنواتنا من غير مقابل." />
        </div>

        {/* ═══ لوحة مدير المبيعات — الوضعية المهمة ═══ */}
        <div style={{
          marginTop: 30, background: CARD, border: `2px solid ${INK}`,
          borderRadius: 14, padding: '22px 24px',
        }}>
          <p style={{
            margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: STEEL,
          }}>لوحة مدير المبيعات</p>
          <h2 style={{ margin: '0 0 9px', fontSize: 19, fontWeight: 800, letterSpacing: '-.01em' }}>
            دي مش نظام إدارة بديل لنظامكم.
          </h2>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.8, color: INK2, maxWidth: '58ch' }}>
            عارفين إن أغلب الشركات عندها نظام حسابات ومخازن شغّال، وإحنا مش بنطلب منكم
            تغيّروه ولا تنقلوا بياناتكم. اللي بنديه <b style={{ color: INK }}>لمدير المبيعات</b>: مكان واحد
            يشوف فيه الطلبات والاستفسارات الجاية من مضمونة، ويتابعها لحد ما تتقفل.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 9, marginTop: 15 }}>
            {[
              'الاستفسارات الجديدة',
              'طلبات عروض الأسعار',
              'متابعة كل عميل',
              'تعديل المنتجات والأسعار',
            ].map((x) => (
              <div key={x} style={{
                display: 'grid', gridTemplateColumns: '15px 1fr', gap: 9, fontSize: 13.5, color: INK,
              }}>
                <span style={{
                  width: 12, height: 12, marginTop: 5, borderRadius: 3,
                  border: `1.5px solid ${MINT}`, background: MINT_SOFT,
                }} />
                <span>{x}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ الأرقام ═══ */}
        <Kicker>مضمونة النهاردة</Kicker>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(105px,1fr))',
          gap: 1, background: LINE, border: `1px solid ${LINE}`, borderRadius: 12, overflow: 'hidden',
        }}>
          <Stat v="٤٥٠" k="منتج وخدمة" />
          <Stat v="٢٦٤" k="مورّد مسجّل" />
          <Stat v="١٤٧" k="مشروع عقاري" />
          <Stat v="٨٣" k="مطوّر عقاري" />
          <Stat v="٧" k="لغات" />
        </div>
        <p style={{ fontSize: 12.5, color: MUTED, margin: '10px 0 0', lineHeight: 1.7 }}>
          الـ<b style={{ color: INK }}>٨٣ مطوّر</b> و<b style={{ color: INK }}>١٤٧ مشروع</b> المعروضين في بورصة
          مضمونة العقارية هما نفسهم المشترين بتوع مواد البناء. · أرقام فعلية، سبتمبر ٢٠٢٦.
        </p>

        {/* ═══ قبل المعرض ═══ */}
        <Kicker>ابدأ قبل المعرض — أحسن من إنك تبدأ في الزحمة</Kicker>
        <div>
          {[
            ['ابعتلنا كتالوجك', 'PDF أو صور أو حتى لينك موقعكم. مش محتاج تملا أي استمارة تانية.'],
            ['إحنا بندخّل المنتجات', 'بنحوّل الكتالوج لمنتجات بمواصفاتها، وبنرجعلك تراجعها سوا قبل النشر.'],
            ['صفحتك جاهزة قبل ما المعرض يفتح', 'شغالة من أول يوم، وتقدر تعرضها من موبايلك لأي زائر على الاستاند.'],
            ['تستلمها بنفسك من الاستاند', 'امسح كود من موبايل مندوبنا، تبقى الصفحة والحساب باسمك — في أقل من دقيقة.'],
          ].map(([t, d], i) => (
            <div key={t} style={{
              display: 'grid', gridTemplateColumns: '28px 1fr', gap: 14,
              padding: '15px 0', borderBottom: i < 3 ? `1px solid ${LINE}` : 'none', alignItems: 'start',
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 8, background: INK, color: PAPER,
                display: 'grid', placeItems: 'center', fontSize: 12.5, fontWeight: 700, marginTop: 1,
              }}>{['١', '٢', '٣', '٤'][i]}</span>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 15.5, fontWeight: 700 }}>{t}</p>
                <p style={{ margin: 0, fontSize: 14, color: INK2, lineHeight: 1.7 }}>{d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ═══ العمولة ═══ */}
        <div style={{
          marginTop: 26, background: INK, color: PAPER, borderRadius: 14,
          padding: '22px 24px', display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, letterSpacing: '-.03em' }}>١٠٪</span>
          <div style={{ flex: 1, minWidth: 230 }}>
            <p style={{ margin: '0 0 6px', fontSize: 15.5, fontWeight: 700 }}>عمولة بعد البيع — وبس</p>
            <p style={{ margin: 0, fontSize: 13.5, opacity: .82, lineHeight: 1.65 }}>
              مضمونة بتاخد نسبتها لما تبيع فعلاً. طول ما مفيش بيع، مفيش أي مقابل.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 12.5, opacity: .72 }}>
              <span>· مفيش اشتراك شهري</span>
              <span>· مفيش رسوم تسجيل</span>
              <span>· مفيش مقابل للعرض</span>
            </div>
          </div>
        </div>

        {/* ═══ الفورم ═══ */}
        <div id="form" style={{
          marginTop: 34, background: CARD, border: `1px solid ${LINE}`,
          borderRadius: 14, padding: '24px 24px 26px',
        }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '26px 8px' }}>
              <p style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800 }}>وصلنا طلبكم ✅</p>
              <p style={{ margin: '0 auto', fontSize: 15, color: INK2, lineHeight: 1.8, maxWidth: '46ch' }}>
                {emailed
                  ? 'بعتنالكم إيميل تأكيد فيه الخطوات. فريقنا هيكلّمكم خلال يوم عمل عشان ناخد الكتالوج ونجهّز صفحة الشركة قبل المعرض.'
                  : 'فريقنا هيكلّمكم خلال يوم عمل عشان ناخد الكتالوج ونجهّز صفحة الشركة قبل المعرض.'}
              </p>
              <a href={`https://wa.me/201002229982`} style={{
                display: 'inline-block', marginTop: 18, background: INK, color: PAPER,
                borderRadius: 10, padding: '11px 22px', fontSize: 14.5, fontWeight: 700, textDecoration: 'none',
              }}>ابعت الكتالوج على الواتساب دلوقتي</a>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, letterSpacing: '-.01em' }}>
                سجّل شركتك قبل المعرض
              </h2>
              <p style={{ margin: '0 0 18px', fontSize: 14, color: INK2 }}>
                دقيقة واحدة. هيوصلكم إيميل تأكيد بالخطوات على طول.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                <div>
                  <label style={lbl} htmlFor="co">اسم الشركة *</label>
                  <input id="co" style={input} value={f.company_name}
                         onChange={(e) => set('company_name', e.target.value)} autoComplete="organization" />
                </div>
                <div>
                  <label style={lbl} htmlFor="nm">اسم المسؤول</label>
                  <input id="nm" style={input} value={f.contact_name}
                         onChange={(e) => set('contact_name', e.target.value)} autoComplete="name" />
                </div>
                <div>
                  <label style={lbl} htmlFor="em">الإيميل *</label>
                  <input id="em" type="email" dir="ltr" style={input} value={f.email}
                         onChange={(e) => set('email', e.target.value)} autoComplete="email" />
                </div>
                <div>
                  <label style={lbl} htmlFor="ph">الموبايل / واتساب</label>
                  <input id="ph" type="tel" dir="ltr" style={input} value={f.phone}
                         onChange={(e) => set('phone', e.target.value)} autoComplete="tel" />
                </div>
                <div>
                  <label style={lbl} htmlFor="ws">الموقع الإلكتروني</label>
                  <input id="ws" dir="ltr" style={input} value={f.website}
                         onChange={(e) => set('website', e.target.value)} placeholder="example.com" />
                </div>
                <div>
                  <label style={lbl} htmlFor="bt">رقم الاستاند (لو تعرفه)</label>
                  <input id="bt" style={input} value={f.booth} onChange={(e) => set('booth', e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={lbl}>صفة الشركة</label>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {ROLES.map((r) => (
                    <button key={r.k} type="button" onClick={() => set('supplier_role', r.k)}
                      style={{
                        border: `1px solid ${f.supplier_role === r.k ? INK : LINE}`,
                        background: f.supplier_role === r.k ? INK : CARD,
                        color: f.supplier_role === r.k ? PAPER : INK2,
                        borderRadius: 999, padding: '7px 15px', fontSize: 13.5,
                        fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>{r.l}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={lbl}>بتشتغلوا في إيه؟ (اختار اللي يخصك)</label>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {CATS.map((c) => (
                    <button key={c} type="button" onClick={() => toggleCat(c)}
                      style={{
                        border: `1px solid ${cats.includes(c) ? MINT : LINE}`,
                        background: cats.includes(c) ? MINT_SOFT : CARD,
                        color: cats.includes(c) ? MINT : INK2,
                        borderRadius: 999, padding: '7px 14px', fontSize: 13,
                        fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>{c}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={lbl} htmlFor="ms">حاجة تحب تقولهالنا؟</label>
                <textarea id="ms" rows={3} style={{ ...input, resize: 'vertical' }} value={f.message}
                          onChange={(e) => set('message', e.target.value)}
                          placeholder="لينك الكتالوج، أو أي حاجة مهمة عن منتجاتكم" />
              </div>

              {err && (
                <p style={{
                  margin: '14px 0 0', fontSize: 13.5, fontWeight: 600, color: '#A02219',
                  background: '#FBEAE8', borderRadius: 9, padding: '10px 13px',
                }}>{err}</p>
              )}

              <button type="submit" disabled={busy} style={{
                width: '100%', marginTop: 16, background: busy ? MUTED : INK, color: PAPER,
                border: 0, borderRadius: 11, padding: '14px', fontSize: 15.5, fontWeight: 700,
                cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
              }}>{busy ? 'بنسجّل…' : 'سجّل شركتي'}</button>

              <p style={{ margin: '12px 0 0', fontSize: 12.5, color: MUTED, textAlign: 'center', lineHeight: 1.7 }}>
                أو ابعتلنا على واتساب <a href="https://wa.me/201002229982" dir="ltr"
                  style={{ color: INK, fontWeight: 700 }}>٠١٠٠٢٢٢٩٩٨٢</a>
              </p>
            </form>
          )}
        </div>

        <p style={{ marginTop: 26, paddingTop: 16, borderTop: `1px solid ${LINE}`, fontSize: 12, color: MUTED }}>
          مضمونة · معاملاتك مضمونة · القاهرة، مصر
        </p>
      </div>
    </div>
  )
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <p style={{
    fontSize: 11, fontWeight: 700, letterSpacing: '.15em', color: STEEL,
    margin: '32px 0 11px',
  }}>{children}</p>
}

function Svc({ t, d }: { t: string; d: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: '16px 17px' }}>
      <p style={{ margin: '0 0 5px', fontSize: 15.5, fontWeight: 700 }}>{t}</p>
      <p style={{ margin: 0, fontSize: 13.5, color: INK2, lineHeight: 1.7 }}>{d}</p>
    </div>
  )
}

function Stat({ v, k }: { v: string; k: string }) {
  return (
    <div style={{ background: CARD, padding: '15px 12px', textAlign: 'center' }}>
      <b style={{ display: 'block', fontSize: 25, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15 }}>{v}</b>
      <span style={{ display: 'block', fontSize: 11.5, color: MUTED, marginTop: 4 }}>{k}</span>
    </div>
  )
}
