'use client'

// ============================================================================
// MediaTab — "الصور" tab for the supplier dashboard.
// Upload & manage: cover, gallery, per-branch photo, per-employee photo.
// Files go to /api/supplier/upload-media (content-images); the DB write is via
// supplier_self_set_media (ownership-checked). Photos render instantly on /s/<slug>.
// ============================================================================

import { useState } from 'react'
import { Camera, Trash2, Plus, Loader2, Building2, Image as ImageIcon } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

const galUrl = (g: any) => (typeof g === 'string' ? g : g?.url || '')

interface Props {
  supplier: { id: string; cover_url?: string | null; gallery?: any[] | null }
  branches: { id: string; name: string; image_url?: string | null }[]
  employees: { id: string; full_name: string; avatar_initial?: string | null; photo_url?: string | null; branch_name?: string | null }[]
  onSaved: () => void
}

export default function MediaTab({ supplier, branches, employees, onSaved }: Props) {
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const gallery: string[] = (supplier.gallery || []).map(galUrl).filter(Boolean)

  function setBusyKey(key: string, on: boolean) {
    setBusy(prev => { const n = new Set(prev); if (on) n.add(key); else n.delete(key); return n })
  }

  async function setMedia(target: string, url: string | null, targetId?: string) {
    const sb = supabaseBrowser as any
    const { data, error } = await sb.rpc('supplier_self_set_media', {
      p_supplier_id: supplier.id, p_target: target, p_url: url, p_target_id: targetId || null,
    })
    if (error || !data?.ok) throw new Error(error?.message || data?.error || 'فشل الحفظ')
  }

  async function handleFile(file: File, kind: string, target: string, targetId: string | undefined, key: string) {
    setBusyKey(key, true)
    try {
      const fd = new FormData()
      fd.append('file', file); fd.append('supplierId', supplier.id); fd.append('kind', kind)
      const res = await fetch('/api/supplier/upload-media', { method: 'POST', body: fd })
      const j = await res.json()
      if (!j.success) throw new Error(j.error || 'فشل الرفع')
      await setMedia(target, j.url, targetId)
      onSaved()
    } catch (e) { alert(e instanceof Error ? e.message : 'حصل خطأ') }
    finally { setBusyKey(key, false) }
  }

  async function removeGallery(url: string) {
    if (!confirm('تشيل الصورة دي من المعرض؟')) return
    setBusyKey('gal:' + url, true)
    try { await setMedia('gallery_remove', url); onSaved() }
    catch (e) { alert(e instanceof Error ? e.message : 'حصل خطأ') }
    finally { setBusyKey('gal:' + url, false) }
  }

  // group employees by branch
  const groups: Record<string, Props['employees']> = {}
  employees.forEach(e => {
    const k = e.branch_name || 'بدون فرع'
    if (!groups[k]) groups[k] = []
    groups[k].push(e)
  })

  return (
    <section dir="rtl">
      <p className="mt-intro">ارفع صور المكان والفريق. أي صورة بتترفع بتظهر فورًا على صفحتك العامة. الصور الـmؤقتة الجاهزة بتختفي أول ما ترفع صورة حقيقية.</p>

      {/* COVER */}
      <h3 className="mt-h">صورة الغلاف</h3>
      <div className="mt-cover">
        <div className="mt-cover-img" style={supplier.cover_url ? { backgroundImage: `url(${supplier.cover_url})` } : undefined}>
          {!supplier.cover_url && <span className="mt-ph"><ImageIcon size={22} /> صورة غلاف مؤقتة</span>}
        </div>
        <label className="mt-btn mt-btn-primary">
          {busy.has('cover') ? <Loader2 size={15} className="mt-spin" /> : <Camera size={15} />}
          {supplier.cover_url ? 'غيّر الغلاف' : 'ارفع غلاف'}
          <input type="file" accept="image/*" hidden disabled={busy.has('cover')}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, 'cover', 'cover', undefined, 'cover'); e.target.value = '' }} />
        </label>
      </div>

      {/* GALLERY */}
      <h3 className="mt-h">معرض الصالون</h3>
      <div className="mt-gal">
        {gallery.map(url => (
          <div key={url} className="mt-gal-item" style={{ backgroundImage: `url(${url})` }}>
            <button className="mt-gal-del" onClick={() => removeGallery(url)} disabled={busy.has('gal:' + url)} aria-label="حذف">
              {busy.has('gal:' + url) ? <Loader2 size={13} className="mt-spin" /> : <Trash2 size={13} />}
            </button>
          </div>
        ))}
        <label className="mt-gal-add">
          {busy.has('gallery') ? <Loader2 size={18} className="mt-spin" /> : <><Plus size={18} /> ضيف صورة</>}
          <input type="file" accept="image/*" hidden disabled={busy.has('gallery')}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, 'gallery', 'gallery_add', undefined, 'gallery'); e.target.value = '' }} />
        </label>
      </div>

      {/* BRANCHES */}
      <h3 className="mt-h">صور الفروع</h3>
      <div className="mt-list">
        {branches.map(b => {
          const key = 'branch:' + b.id
          return (
            <div key={b.id} className="mt-row">
              <div className="mt-thumb" style={b.image_url ? { backgroundImage: `url(${b.image_url})` } : undefined}>
                {!b.image_url && <Building2 size={18} />}
              </div>
              <div className="mt-row-name">{b.name}</div>
              <label className="mt-btn">
                {busy.has(key) ? <Loader2 size={14} className="mt-spin" /> : <Camera size={14} />}
                {b.image_url ? 'تغيير' : 'رفع'}
                <input type="file" accept="image/*" hidden disabled={busy.has(key)}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, 'branch', 'branch', b.id, key); e.target.value = '' }} />
              </label>
            </div>
          )
        })}
      </div>

      {/* TEAM */}
      <h3 className="mt-h">صور الفريق</h3>
      {Object.entries(groups).map(([branchName, list]) => (
        <div key={branchName} className="mt-grp">
          <div className="mt-grp-h">{branchName} <span>({list.length})</span></div>
          <div className="mt-emp-grid">
            {list.map(emp => {
              const key = 'emp:' + emp.id
              return (
                <label key={emp.id} className="mt-emp" title="اضغط لرفع صورة">
                  <div className="mt-emp-av" style={emp.photo_url ? { backgroundImage: `url(${emp.photo_url})` } : undefined}>
                    {!emp.photo_url && <span>{emp.avatar_initial || (emp.full_name || '?').charAt(0)}</span>}
                    <span className="mt-emp-cam">{busy.has(key) ? <Loader2 size={13} className="mt-spin" /> : <Camera size={13} />}</span>
                  </div>
                  <span className="mt-emp-name">{emp.full_name}</span>
                  <input type="file" accept="image/*" hidden disabled={busy.has(key)}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, 'employee', 'employee', emp.id, key); e.target.value = '' }} />
                </label>
              )
            })}
          </div>
        </div>
      ))}

      <style jsx>{`
        .mt-intro { font-size: 13px; color: #41504A; line-height: 1.7; background: linear-gradient(135deg, rgba(212,160,23,.07), rgba(47,160,132,.07)); border: 1px solid rgba(31,111,95,.15); border-radius: 12px; padding: 12px 14px; margin: 0 0 22px; }
        .mt-h { font-size: 15px; font-weight: 800; margin: 24px 0 12px; color: #0A0A0A; }
        .mt-h:first-of-type { margin-top: 0; }
        .mt-cover { display: flex; flex-direction: column; gap: 10px; }
        .mt-cover-img { width: 100%; height: 150px; border-radius: 14px; background-size: cover; background-position: center; background-image: linear-gradient(135deg,#1d6253,#2FA084 70%,#6FCF97); display: grid; place-items: center; }
        .mt-ph { color: rgba(255,255,255,.9); font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
        .mt-btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 9px 14px; border-radius: 10px; border: 1px solid rgba(31,111,95,.3); background: white; color: #1F6F5F; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; align-self: flex-start; }
        .mt-btn:hover { background: #F3F7F5; }
        .mt-btn-primary { background: linear-gradient(100deg,#d4a017,#2FA084 55%,#1F6F5F); color: white; border: none; }
        .mt-gal { display: flex; flex-wrap: wrap; gap: 10px; }
        .mt-gal-item { position: relative; width: 116px; height: 88px; border-radius: 12px; background-size: cover; background-position: center; background-color: #E7F1ED; }
        .mt-gal-del { position: absolute; top: 5px; left: 5px; width: 26px; height: 26px; border-radius: 8px; border: none; background: rgba(153,27,27,.92); color: white; cursor: pointer; display: grid; place-items: center; }
        .mt-gal-add { width: 116px; height: 88px; border-radius: 12px; border: 2px dashed rgba(31,111,95,.3); background: #FAFAF7; color: #1F6F5F; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
        .mt-gal-add:hover { background: #F3F7F5; }
        .mt-list { display: flex; flex-direction: column; gap: 8px; }
        .mt-row { background: white; border: 1px solid rgba(10,10,10,.05); border-radius: 12px; padding: 10px 12px; display: flex; align-items: center; gap: 12px; }
        .mt-thumb { width: 52px; height: 52px; border-radius: 10px; background-size: cover; background-position: center; background-image: linear-gradient(135deg,rgba(31,111,95,.12),rgba(212,160,23,.14)); display: grid; place-items: center; color: #1F6F5F; flex: none; }
        .mt-row-name { flex: 1; font-size: 14px; font-weight: 800; min-width: 0; }
        .mt-grp { margin-bottom: 18px; }
        .mt-grp-h { font-size: 12px; font-weight: 800; color: #1F6F5F; margin-bottom: 10px; }
        .mt-grp-h span { color: #7C8A84; font-weight: 700; }
        .mt-emp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); gap: 14px 8px; }
        .mt-emp { display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; text-align: center; }
        .mt-emp-av { position: relative; width: 64px; height: 64px; border-radius: 50%; background-size: cover; background-position: center; background-image: linear-gradient(135deg,#1d6253,#2FA084 70%,#6FCF97); display: grid; place-items: center; color: white; font-weight: 800; font-size: 20px; }
        .mt-emp-cam { position: absolute; bottom: -2px; left: -2px; width: 24px; height: 24px; border-radius: 50%; background: #1F6F5F; color: white; display: grid; place-items: center; border: 2px solid white; }
        .mt-emp-name { font-size: 11px; font-weight: 700; color: #0A0A0A; line-height: 1.3; max-width: 78px; }
        .mt-spin { animation: mt-spin 1s linear infinite; }
        @keyframes mt-spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  )
}
