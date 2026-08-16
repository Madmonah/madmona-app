'use client'

// ============================================================================
// 🛵 تسجيل طيار — /delivery/register
//
// (١٦ أغسطس ٢٠٢٦ — محمد: «عايز الطيار يكون ليه حساب ومحتاجين منه يرفع
//  صورة رخصة المركبة وصورة بطاقته»)
//
// فورم واحد من الموبايل: بياناته + صورتين (كاميرا الموبايل مباشرة عن
// طريق capture). بعد التسجيل بياخد لينك حسابه وبيبقى «قيد المراجعة»
// لحد ما الأدمن يوافق — ساعتها بس بيبدأ يستلم رحلات.
// ============================================================================

import { useState } from 'react'

export default function RiderRegister() {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ link: string; already?: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/delivery/register', {
        method: 'POST',
        body: new FormData(e.currentTarget),
      })
      const j = await res.json()
      if (j.ok) setDone({ link: j.rider_link, already: j.already })
      else setError(j.error || 'حصلت مشكلة — جرّب تاني')
    } catch {
      setError('النت قطع — جرّب تاني')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 52 }}>{done.already ? '👋' : '✅'}</div>
          <h2 style={{ color: '#14231E', fontWeight: 900 }}>
            {done.already ? 'إنت مسجّل معانا قبل كده' : 'تمام! حسابك اتسجّل'}
          </h2>
          <p style={{ color: '#7C8A84', fontSize: 15, lineHeight: 1.8 }}>
            {done.already
              ? 'ده لينك حسابك — احفظه.'
              : 'أوراقك قيد المراجعة. أول ما نوافق عليها هتبدأ توصلك رحلات على الواتساب.'}
          </p>
          <a href={done.link} style={{
            display: 'inline-block', marginTop: 14, padding: '14px 28px', borderRadius: 12,
            background: '#059669', color: '#fff', fontWeight: 900, textDecoration: 'none',
          }}>افتح حسابك 🛵</a>
          <p style={{ color: '#7C8A84', fontSize: 13, marginTop: 14 }}>
            ⚠️ احفظ اللينك ده — هو حسابك.
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#14231E', marginBottom: 4 }}>
        🛵 اشتغل طيار مع مضمونة
      </h1>
      <p style={{ color: '#7C8A84', fontSize: 14, marginBottom: 20 }}>
        سجّل مرة واحدة، وأول ما نراجع أوراقك هتبدأ تستلم رحلات وتقبض بالمشوار.
      </p>

      <form onSubmit={submit}>
        <Field label="اسمك بالكامل">
          <input name="name" required placeholder="زي ما هو في البطاقة" style={inp} />
        </Field>
        <Field label="رقم موبايلك (اللي عليه واتساب)">
          <input name="phone" required inputMode="tel" placeholder="01XXXXXXXXX" style={inp} />
        </Field>
        <Field label="مركبتك">
          <select name="vehicle" style={inp} defaultValue="موتوسيكل">
            <option>موتوسيكل</option>
            <option>عربية</option>
            <option>عجلة</option>
            <option>تروسيكل</option>
          </select>
        </Field>
        <Field label="المناطق اللي تقدر تشتغل فيها" hint="افصل بينهم بفاصلة — مثال: مدينة نصر، مصر الجديدة">
          <input name="zones" required placeholder="مدينة نصر، مصر الجديدة" style={inp} />
        </Field>

        {/* الأوراق — كاميرا الموبايل مباشرة */}
        <Field label="📷 صورة بطاقتك (الوش الأمامي)" hint="واضحة ومقروءة — دي اللي بنراجع بيها حسابك">
          <input name="national_id" type="file" accept="image/*" capture="environment" required style={inp} />
        </Field>
        <Field label="📷 صورة رخصة المركبة" hint="سارية — مش منتهية">
          <input name="vehicle_license" type="file" accept="image/*" capture="environment" required style={inp} />
        </Field>

        {error && (
          <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: 12, borderRadius: 10, fontSize: 14, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={busy} style={{
          width: '100%', padding: 16, borderRadius: 14, border: 'none',
          background: '#059669', color: '#fff', fontWeight: 900, fontSize: 17,
          opacity: busy ? 0.6 : 1,
        }}>
          {busy ? '⏳ ثواني…' : 'سجّل وابعت أوراقي'}
        </button>

        <p style={{ color: '#7C8A84', fontSize: 12, marginTop: 12, lineHeight: 1.7 }}>
          🔒 صور أوراقك بتتحفظ في مكان مقفول ومحدش يشوفها غير فريق المراجعة —
          مش بتظهر على الموقع ولا لأي حد تاني.
        </p>
      </form>
    </Shell>
  )
}

const inp: React.CSSProperties = {
  width: '100%', padding: '13px 14px', borderRadius: 12, border: '1px solid #E5DFD3',
  fontSize: 15, background: '#fff', color: '#14231E', boxSizing: 'border-box',
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <span style={{ display: 'block', fontWeight: 800, fontSize: 14, color: '#14231E', marginBottom: 6 }}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: 12, color: '#7C8A84', marginTop: 4 }}>{hint}</span>}
    </label>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#FAFAF7', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 20 }}>{children}</div>
    </div>
  )
}
