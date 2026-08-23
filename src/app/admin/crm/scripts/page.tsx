'use client'
/* ============================================================================
   🖨️ /admin/crm/scripts — اسكريبتات البيع، نسخة للطباعة
   ============================================================================
   (٢٣ أغسطس ٢٠٢٦ — محمد: «عايز نسخة للطباعة بحيث فريق مضمونة»)

   ورقة A4 لكل نشاط: الفتحة · الوجع · اللي بنقدّمه · الاعتراضات والرد ·
   القفلة · ونص رسالة الواتساب بالظبط زي ما زرار «أرسل» بيبعتها — عشان
   اللي بيتقال في التليفون هو اللي بيتبعت في الرسالة، مش كلامين مختلفين.

   المحتوى كله من src/lib/crmScripts.ts — نفس المصدر بتاع زرار «أرسل».
   يعني أي تعديل بيظهر في الاتنين مع بعض، ومستحيل يبقى عندك ورق مطبوع
   بيقول حاجة والرسالة بتقول حاجة تانية.

   الترتيب بالأرقام الحقيقية (الأكتر أرقام الأول) — بيتقرا من crm_overview
   فالورق بيطلع مرتّب حسب شغل النهاردة مش حسب ترتيب متكتّب في الكود.
   ============================================================================ */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Printer, Loader2 } from 'lucide-react'
import { adminRpc } from '@/lib/adminRpc'
import { CRM_SCRIPTS, scriptFor, scriptText } from '@/lib/crmScripts'

type SpecRow = { key: string; name_ar: string; contacts: number }

export default function CrmScriptsPrintPage() {
  const [specs, setSpecs] = useState<SpecRow[] | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await adminRpc<{ ok: boolean; specialties: SpecRow[] }>('crm_overview')
        if (r?.ok) setSpecs(r.specialties || [])
      } catch { setSpecs([]) }
    })()
  }, [])

  // النشاطات اللي عندها أرقام فعلاً، الأكتر الأول. لو الـRPC وقع بنطبع الكل.
  const order = (specs && specs.length
    ? specs.filter(s => CRM_SCRIPTS[s.key]).sort((a, b) => b.contacts - a.contacts)
    : Object.keys(CRM_SCRIPTS).map(k => ({ key: k, name_ar: CRM_SCRIPTS[k].label, contacts: 0 })))

  return (
    <div className="scripts-root">
      <style>{`
        .scripts-root { background:#f3f4f2; min-height:100vh; padding:20px 0; font-family:Cairo,Tahoma,sans-serif; }
        .sheet {
          width:210mm; min-height:297mm; margin:0 auto 16px; background:#fff; padding:18mm 16mm;
          box-sizing:border-box; box-shadow:0 2px 14px rgba(0,0,0,.08); color:#16241f;
        }
        .sheet h2 { font-size:26pt; font-weight:900; margin:0 0 2mm; color:#059669; }
        .sheet .cnt { font-size:10pt; color:#5b6b64; margin:0 0 8mm; }
        .blk { margin-bottom:7mm; }
        .blk h3 {
          font-size:11pt; font-weight:900; margin:0 0 2.5mm; color:#16241f;
          border-right:3px solid #059669; padding-right:3mm;
        }
        .blk p, .blk li { font-size:11.5pt; line-height:1.85; margin:0 0 1.5mm; }
        .blk ul { margin:0; padding-right:6mm; }
        .obj { border:1px solid #e7e9e5; border-radius:3mm; padding:3mm 4mm; margin-bottom:2.5mm; }
        .obj b { display:block; font-size:11pt; margin-bottom:1mm; }
        .obj span { font-size:11pt; color:#3c4a44; line-height:1.8; }
        .wa {
          background:#f4f8f6; border:1px solid #cfe3da; border-radius:3mm; padding:4mm 5mm;
          white-space:pre-wrap; font-size:10.5pt; line-height:1.8;
        }
        .foot { margin-top:8mm; padding-top:3mm; border-top:1px solid #e7e9e5; font-size:9pt; color:#5b6b64; }
        .bar { max-width:210mm; margin:0 auto 14px; display:flex; gap:8px; align-items:center; }
        .bar a, .bar button {
          display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:10px;
          border:1px solid #e7e9e5; background:#fff; color:#16241f; font-weight:800; font-size:13px;
          cursor:pointer; font-family:inherit; text-decoration:none;
        }
        .bar .go { background:#059669; color:#fff; border-color:#059669; }
        /* 🖨️ الطباعة: ورقة لكل نشاط، من غير أي عناصر شاشة */
        @media print {
          .scripts-root { background:#fff; padding:0; }
          .bar { display:none !important; }
          .sheet { box-shadow:none; margin:0; width:auto; min-height:auto; padding:12mm 14mm; page-break-after:always; }
          .sheet:last-child { page-break-after:auto; }
        }
        @page { size:A4; margin:0; }
      `}</style>

      <div className="bar">
        <Link href="/admin/crm"><ArrowRight size={16} /> رجوع للـCRM</Link>
        <button className="go" onClick={() => window.print()}><Printer size={16} /> اطبع</button>
        <span style={{ fontSize: 12, color: '#5b6b64', marginRight: 'auto' }}>
          ورقة A4 لكل نشاط · نفس الكلام اللي زرار «أرسل» بيبعته
        </span>
      </div>

      {!specs && (
        <div className="bar" style={{ color: '#5b6b64', fontSize: 13 }}>
          <Loader2 size={15} className="animate-spin" /> بنجيب أرقام كل نشاط…
        </div>
      )}

      {order.map(s => {
        const sc = scriptFor(s.key)
        return (
          <div className="sheet" key={s.key}>
            <h2>{sc.label}</h2>
            <p className="cnt">
              اسكريبت مضمونة — تحويل النشاط لأونلاين
              {s.contacts > 0 && <> · <b>{s.contacts.toLocaleString('ar-EG')}</b> رقم في القايمة</>}
            </p>

            <div className="blk">
              <h3>الفتحة</h3>
              <p>«{sc.opener}»</p>
            </div>

            <div className="blk">
              <h3>وجعه هو بالذات</h3>
              <p>{sc.pain}</p>
            </div>

            <div className="blk">
              <h3>اللي بنعمله له</h3>
              <ul>{sc.offer.map((o, i) => <li key={i}>{o}</li>)}</ul>
            </div>

            <div className="blk">
              <h3>لو قال…</h3>
              {sc.objections.map((o, i) => (
                <div className="obj" key={i}>
                  <b>«{o.q}»</b>
                  <span>{o.a}</span>
                </div>
              ))}
            </div>

            <div className="blk">
              <h3>القفلة</h3>
              <p>«{sc.close}»</p>
            </div>

            <div className="blk">
              <h3>رسالة الواتساب (نفسها اللي بتطلع من زرار «أرسل»)</h3>
              <div className="wa">{scriptText(s.key, '[اسم العميل]', '[اسمك]')}</div>
            </div>

            <div className="foot">
              مضمونة · ٧ ش سليمان عزمي — بجوار الكلية الحربية، مصر الجديدة
              <br />
              مفيش أسعار ولا نِسب في الورقة دي عن قصد — أي رقم بيتقال من محمد.
            </div>
          </div>
        )
      })}
    </div>
  )
}
