'use client'

/* ============================================================================
   /admin/crm — نظام تتبّع فريق مضمونة: الأرقام · التخصصات · المكالمات · التاسكات
   ============================================================================
   🎯 محمد (٢١ أغسطس ٢٠٢٦):
     «عايز الليد يتوزّع عليهم كل واحد ياخد الجزء الخاص بيه، والداتا تكون
      مسمّعة في الـCRM بتاع مضمونة، وكل واحدة تعمل مكالمة نفرّغ المكالمة
      ونحطّ تاسكات بناءً عليها، وحالة كل عميل … يسمّع عندنا نتيجة أي شغل»
     «التوزيع بالأدوار، وعايزين نقسّم كل الأرقام اللي عندنا في جداول ونصدّر
      منها برضو حسب التخصص، وكله يكون ظاهر، والمارد هو اللي هيفرّغ المكالمة
      ويحطّ التاسكات، ولو فيه حاجة ظهرت تخصّ شخص تاني التاسك ينزل على الشخص
      التاني أوتوماتيك»

   الشاشة أربع تابات:
     ١) نظرة عامة — كل تخصص، كام رقم فيه، ومين مسؤول عنه (وبتتعدّل من هنا)
     ٢) الأرقام   — فلترة بالتخصص/الموظف/الحالة + بحث + **تصدير CSV**
     ٣) التاسكات  — والتاسك المحوّل بيبان عليه **مين حوّله وليه**
     ٤) ملف العميل (مودال) — مكالماته المفرّغة + تاسكاته + آخر رسايله

   ⚠️ **مفيش حاجة متكتّبة في الكود**: التخصصات وقواعد المطابقة والمسؤولين
      كلهم في `crm_specialties` / `crm_staff_specialties` وبيتعدّلوا من هنا.
      (قاعدة محمد: «اللي تقدر تخليه ديناميك خليه ديناميك»)

   ⚠️ **مابنخترعش تصنيف**: الرقم اللي مفيش عليه دليل بيفضل «مش متصنّف»
      وبيبان كده صريح — مش بنحطّه في خانة عشوائية.

   🔐 محميّة بـ`is_madmona_staff() OR is_admin_or_service()`.
   ============================================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { adminRpc } from '@/lib/adminRpc'
import { fmtDateTime, sinceLabel } from '@/lib/arDateTime'
import {
  ArrowRight, Loader2, ShieldAlert, RefreshCw, Users, Phone, ListChecks,
  Download, Search, X, Shuffle, Sparkles, AlertTriangle, CheckCircle2,
  CornerDownLeft, Tag, UserCog, Save,
} from 'lucide-react'

const C = {
  bg: '#FAFAF7', card: '#ffffff', ink: '#16241f', sub: '#5b6b64',
  green: '#059669', green2: '#2FA084', line: '#e7e9e5',
  danger: '#b3261e', warn: '#9a6b00', gold: '#d4a017', blue: '#1d4ed8',
}

type Owner = { profile_id: string; name: string; primary: boolean }
type Specialty = {
  key: string; name_ar: string; active: boolean; contacts: number
  match_cats: string[]; match_words: string[]; owners: Owner[]
}
type Staff = {
  profile_id: string; name: string; role: string
  contacts: number; open_tasks: number; calls: number; specialties: string[]
}
type Overview = {
  ok: boolean; error?: string
  totals: {
    contacts: number; assigned: number; unclassified: number; manual: number
    calls: number; open_tasks: number; routed_tasks: number
  }
  specialties: Specialty[]
  staff: Staff[]
  staff_no_account: string[]
  by_source: Record<string, number>
  by_status: Record<string, number>
}
type Contact = {
  id: string; phone: string; name: string | null
  specialty: string | null; specialty_ar: string | null; specialty_src: string | null
  owner_id: string | null; owner: string | null
  status: string; kind: string; supplier_id: string | null; business: string | null
  last_contact_at: string | null; next_action_at: string | null; notes: string | null
  calls: number; open_tasks: number
}
type Task = {
  id: string; title: string; detail: string | null; status: string; priority: string
  specialty: string | null; specialty_ar: string | null; due_at: string | null; created_at: string
  owner_id: string | null; owner: string | null
  routed_from: string | null; route_reason: string | null
  contact_id: string | null; contact_phone: string | null; contact_name: string | null
}
type Call = {
  id: string; started_at: string; direction: string; channel: string
  duration_sec: number | null; summary: string | null; transcript: string | null
  outcome: string | null; staff: string | null; filled_by: string | null
}
type Detail = {
  ok: boolean; error?: string
  contact: Contact
  calls: Call[]
  tasks: Task[]
  messages: { at: string; dir: string; body: string }[]
}

const SRC_LABEL: Record<string, string> = {
  supplier: 'من تصنيف إعلاناته',
  wa_category: 'من تصنيف محادثة الواتساب',
  listing: 'من إعلان بنفس الرقم',
  words: 'من كلام رسايله',
  manual: 'اتحدّد بالإيد',
  none: 'مفيش دليل',
}
const STATUS_LABEL: Record<string, string> = {
  new: 'جديد', contacted: 'اتكلّمنا معاه', interested: 'مهتم',
  offer_sent: 'اتبعتله عرض', won: 'اتقفل ✅', lost: 'ضاع', spam: 'سبام',
}

async function callRpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  try {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (session?.user) {
      const { data, error } = await (supabaseBrowser.rpc as unknown as (
        f: string, a: Record<string, unknown>,
      ) => Promise<{ data: T | null; error: { message: string } | null }>)(fn, args)
      if (!error && data != null) {
        const o = data as unknown as { ok?: boolean; error?: string }
        if (o?.ok !== false || o?.error !== 'forbidden') return data
      }
    }
  } catch { /* بنكمل على بوابة الأدمن */ }
  return await adminRpc<T>(fn, args)
}

/* CSV بـBOM عشان إكسل يقرا العربي صح */
function downloadCsv(name: string, rows: Record<string, unknown>[], headers: [string, string][]) {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const body = [
    headers.map(h => esc(h[1])).join(','),
    ...rows.map(r => headers.map(h => esc(r[h[0]])).join(',')),
  ].join('\r\n')
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function AdminCrmPage() {
  const [tab, setTab] = useState<'overview' | 'contacts' | 'tasks'>('overview')
  const [ov, setOv] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null)

  // الأرقام
  const [rows, setRows] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [fSpec, setFSpec] = useState<string>('')
  const [fOwner, setFOwner] = useState<string>('')
  const [fStatus, setFStatus] = useState<string>('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const PAGE = 50

  // التاسكات
  const [tasks, setTasks] = useState<Task[]>([])

  // ملف العميل
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailBusy, setDetailBusy] = useState(false)

  // تعديل تخصصات موظف
  const [editStaff, setEditStaff] = useState<Staff | null>(null)
  const [editSpecs, setEditSpecs] = useState<string[]>([])

  const loadOverview = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const r = await callRpc<Overview>('crm_overview')
      if (!r?.ok) setErr(r?.error === 'forbidden' ? 'forbidden' : (r?.error || 'مقدرناش نحمّل'))
      else setOv(r)
    } catch (e) { setErr(e instanceof Error ? e.message : 'مقدرناش نحمّل') }
    setLoading(false)
  }, [])

  const loadContacts = useCallback(async (reset = false) => {
    setLoading(true)
    try {
      const off = reset ? 0 : page * PAGE
      const r = await callRpc<{ ok: boolean; total: number; rows: Contact[] }>('crm_contacts_list', {
        p_specialty: fSpec || null, p_owner: fOwner || null, p_status: fStatus || null,
        p_q: q || null, p_limit: PAGE, p_offset: off,
      })
      if (r?.ok) { setRows(r.rows || []); setTotal(r.total || 0); if (reset) setPage(0) }
    } catch { /* الفلتر مش حرج */ }
    setLoading(false)
  }, [fSpec, fOwner, fStatus, q, page])

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const r = await callRpc<{ ok: boolean; rows: Task[] }>('crm_tasks_list', { p_limit: 500 })
      if (r?.ok) setTasks(r.rows || [])
    } catch { /* — */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadOverview() }, [loadOverview])
  useEffect(() => { if (tab === 'contacts') loadContacts() }, [tab, page, loadContacts])
  useEffect(() => { if (tab === 'tasks') loadTasks() }, [tab, loadTasks])

  async function run(fn: string, args: Record<string, unknown>, okMsg: string) {
    setBusy(fn); setFlash(null)
    try {
      const r = await callRpc<{ ok: boolean; error?: string } & Record<string, unknown>>(fn, args)
      if (r?.ok) {
        setFlash({ msg: okMsg, ok: true })
        await loadOverview()
        if (tab === 'contacts') await loadContacts(true)
        if (tab === 'tasks') await loadTasks()
      } else setFlash({ msg: r?.error || 'مقدرناش ننفّذ', ok: false })
    } catch (e) { setFlash({ msg: e instanceof Error ? e.message : 'خطأ', ok: false }) }
    setBusy(null)
  }

  async function openDetail(id: string) {
    setDetailBusy(true)
    try {
      const r = await callRpc<Detail>('crm_contact_detail', { p_contact: id })
      if (r?.ok) setDetail(r)
      else setFlash({ msg: r?.error || 'مقدرناش نفتح الملف', ok: false })
    } catch (e) { setFlash({ msg: e instanceof Error ? e.message : 'خطأ', ok: false }) }
    setDetailBusy(false)
  }

  async function exportCsv() {
    setBusy('export')
    try {
      const r = await callRpc<{ ok: boolean; rows: Contact[]; total: number }>('crm_contacts_list', {
        p_specialty: fSpec || null, p_owner: fOwner || null, p_status: fStatus || null,
        p_q: q || null, p_limit: 5000, p_offset: 0,
      })
      if (r?.ok) {
        const label = fSpec === '__none__' ? 'غير-مصنّف'
          : (ov?.specialties.find(s => s.key === fSpec)?.name_ar || 'كل-التخصصات')
        downloadCsv(`مضمونة-أرقام-${label}.csv`, r.rows as unknown as Record<string, unknown>[], [
          ['phone', 'الرقم'], ['name', 'الاسم'], ['business', 'البيزنس'],
          ['specialty_ar', 'التخصص'], ['specialty_src', 'مصدر التصنيف'],
          ['owner', 'المسؤول'], ['status', 'الحالة'], ['kind', 'النوع'],
          ['last_contact_at', 'آخر تواصل'], ['calls', 'مكالمات'], ['open_tasks', 'تاسكات مفتوحة'],
        ])
        setFlash({ msg: `اتصدّر ${r.rows.length} رقم${r.total > r.rows.length ? ` من ${r.total} (السقف ٥٠٠٠)` : ''}`, ok: true })
      }
    } catch (e) { setFlash({ msg: e instanceof Error ? e.message : 'خطأ', ok: false }) }
    setBusy(null)
  }

  const noOwnerSpecs = useMemo(
    () => (ov?.specialties || []).filter(s => s.active && s.owners.length === 0 && s.contacts > 0),
    [ov],
  )

  const btn = (kind: 'primary' | 'ghost' = 'ghost'): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
    padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700,
    border: `1px solid ${kind === 'primary' ? C.green : C.line}`,
    background: kind === 'primary' ? C.green : '#fff',
    color: kind === 'primary' ? '#fff' : C.ink,
  })
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '7px 16px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
    border: `1px solid ${active ? C.green : C.line}`,
    background: active ? C.green : C.card, color: active ? '#fff' : C.ink,
    fontSize: 13, fontWeight: 700,
  })
  const card: React.CSSProperties = {
    background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 16,
  }

  if (err === 'forbidden' || err?.includes('بوابة الأدمن')) {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 32, textAlign: 'center', maxWidth: 380 }}>
          <ShieldAlert style={{ width: 32, height: 32, color: C.danger, margin: '0 auto 12px' }} />
          <h1 style={{ fontWeight: 800, margin: '0 0 8px' }}>الشاشة دي لفريق مضمونة</h1>
          <p style={{ fontSize: 13, color: C.sub, margin: '0 0 16px' }}>سجّل دخولك بحسابك في مضمونة وجرّب تاني.</p>
          <Link href="/auth/login?redirect=/admin/crm" style={{ display: 'block', background: C.green, color: '#fff', padding: 12, borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>دخول</Link>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: 'Cairo, Inter, system-ui, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/dashboard" style={{ width: 36, height: 36, borderRadius: 999, background: '#fff', border: `1px solid ${C.line}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowRight style={{ width: 16, height: 16, color: C.sub }} />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>CRM مضمونة</h1>
            <p style={{ fontSize: 12, color: C.sub, margin: '2px 0 0' }}>الأرقام · التخصصات · المكالمات · التاسكات</p>
          </div>
          <button onClick={() => { loadOverview(); if (tab === 'contacts') loadContacts(true); if (tab === 'tasks') loadTasks() }} disabled={loading} style={btn()}>
            <RefreshCw style={{ width: 15, height: 15 }} className={loading ? 'animate-spin' : ''} /> تحديث
          </button>
        </div>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 12px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          <button style={chip(tab === 'overview')} onClick={() => setTab('overview')}>نظرة عامة</button>
          <button style={chip(tab === 'contacts')} onClick={() => setTab('contacts')}>
            الأرقام {ov ? `(${ov.totals.contacts})` : ''}
          </button>
          <button style={chip(tab === 'tasks')} onClick={() => setTab('tasks')}>
            التاسكات {ov ? `(${ov.totals.open_tasks})` : ''}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
        {flash && (
          <div style={{ ...card, padding: '10px 14px', marginBottom: 12, borderColor: flash.ok ? C.green2 : C.danger, color: flash.ok ? C.green : C.danger, fontSize: 13, fontWeight: 700 }}>
            {flash.msg}
          </div>
        )}

        {/* ══════════ نظرة عامة ══════════ */}
        {tab === 'overview' && ov && (
          <>
            {/* بانر: التخصصات اللي ملهاش مسؤول */}
            {noOwnerSpecs.length > 0 && (
              <div style={{ ...card, marginBottom: 14, borderColor: C.gold, background: '#fffbf0' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AlertTriangle style={{ width: 18, height: 18, color: C.warn, flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>الخطوة الأولى: حدّد مين مسؤول عن كل تخصص</div>
                    <p style={{ fontSize: 12.5, color: C.sub, margin: '6px 0 10px', lineHeight: 1.7 }}>
                      فيه {noOwnerSpecs.length} تخصص فيهم أرقام ولسه مالهمش مسؤول:
                      {' '}<b>{noOwnerSpecs.map(s => s.name_ar).join(' · ')}</b>.
                      <br />
                      دوس على أي موظف تحت وحدّد تخصصاته، وبعدين اضغط «وزّع بالدور».
                      لو وزّعت قبل ما تحدّد، التخصص اللي ملوش مسؤول هيتوزّع على الفريق كله.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* أرقام سريعة */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 14 }}>
              {[
                { k: 'كل الأرقام', v: ov.totals.contacts, c: C.ink },
                { k: 'متوزّع على الفريق', v: ov.totals.assigned, c: C.green },
                { k: 'لسه مش متصنّف', v: ov.totals.unclassified, c: C.warn },
                { k: 'مكالمات مفرّغة', v: ov.totals.calls, c: C.blue },
                { k: 'تاسكات مفتوحة', v: ov.totals.open_tasks, c: C.ink },
                { k: 'تاسكات اتحوّلت تلقائيًا', v: ov.totals.routed_tasks, c: C.green2 },
              ].map(x => (
                <div key={x.k} style={card}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: x.c }}>{x.v.toLocaleString('ar-EG')}</div>
                  <div style={{ fontSize: 11.5, color: C.sub, marginTop: 2 }}>{x.k}</div>
                </div>
              ))}
            </div>

            {/* أزرار التشغيل */}
            <div style={{ ...card, marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button style={btn('primary')} disabled={!!busy}
                onClick={() => run('crm_assign_round_robin', {}, 'التوزيع اتعمل')}>
                {busy === 'crm_assign_round_robin' ? <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> : <Shuffle style={{ width: 15, height: 15 }} />}
                وزّع بالدور على الفريق
              </button>
              <button style={btn()} disabled={!!busy}
                onClick={() => run('crm_classify_contacts', {}, 'التصنيف اتحدّث')}>
                <Sparkles style={{ width: 15, height: 15 }} /> صنّف اللي لسه مش متصنّف
              </button>
              <button style={btn()} disabled={!!busy}
                onClick={() => run('crm_ingest_contacts', {}, 'الأرقام اتجمّعت')}>
                <RefreshCw style={{ width: 15, height: 15 }} /> اسحب أرقام جديدة
              </button>
              <span style={{ fontSize: 11.5, color: C.sub, marginRight: 'auto' }}>
                التوزيع مابيلمسش حد ليه مسؤول بالفعل · التصنيف اليدوي مابيتدهسش
              </span>
            </div>

            {/* التخصصات */}
            <div style={{ ...card, marginBottom: 14, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag style={{ width: 16, height: 16, color: C.green }} />
                <b style={{ fontSize: 14 }}>التخصصات</b>
                <span style={{ fontSize: 11.5, color: C.sub }}>القواعد داتا مش كود — تتعدّل من الداتابيز أو من هنا</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f7f8f6', color: C.sub, fontSize: 11.5 }}>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>التخصص</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>الأرقام</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>المسؤولين</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>كلمات المطابقة</th>
                      <th style={{ padding: '8px 12px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {ov.specialties.map(s => (
                      <tr key={s.key} style={{ borderTop: `1px solid ${C.line}`, opacity: s.active ? 1 : 0.5 }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{s.name_ar}
                          <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 400 }}>{s.key}</div>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 800 }}>{s.contacts.toLocaleString('ar-EG')}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {s.owners.length === 0
                            ? <span style={{ color: C.warn, fontWeight: 700 }}>مفيش مسؤول</span>
                            : s.owners.map(o => o.name).join(' · ')}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 11.5, color: C.sub, maxWidth: 320 }}>
                          {(s.match_words || []).slice(0, 8).join('، ')}
                          {(s.match_words || []).length > 8 ? ` … +${s.match_words.length - 8}` : ''}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'left' }}>
                          <button style={{ ...btn(), padding: '5px 10px', fontSize: 12 }}
                            onClick={() => { setFSpec(s.key); setTab('contacts'); setPage(0) }}>
                            شوف الأرقام
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* الفريق */}
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users style={{ width: 16, height: 16, color: C.green }} />
                <b style={{ fontSize: 14 }}>الفريق</b>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10, padding: 14 }}>
                {ov.staff.map(st => (
                  <div key={st.profile_id} style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <b style={{ fontSize: 13.5, flex: 1 }}>{st.name}</b>
                      <button title="تخصصاته" style={{ ...btn(), padding: 5 }}
                        onClick={() => { setEditStaff(st); setEditSpecs(st.specialties || []) }}>
                        <UserCog style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                    <div style={{ fontSize: 11.5, color: C.sub, margin: '6px 0' }}>
                      {(st.specialties || []).length === 0
                        ? <span style={{ color: C.warn, fontWeight: 700 }}>مفيش تخصصات متحدّدة</span>
                        : st.specialties.map(k => ov.specialties.find(s => s.key === k)?.name_ar || k).join(' · ')}
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 11.5, color: C.sub }}>
                      <span><b style={{ color: C.ink }}>{st.contacts}</b> رقم</span>
                      <span><b style={{ color: C.ink }}>{st.calls}</b> مكالمة</span>
                      <span><b style={{ color: C.ink }}>{st.open_tasks}</b> تاسك</span>
                    </div>
                    <button style={{ ...btn(), width: '100%', justifyContent: 'center', marginTop: 8, padding: '6px 10px', fontSize: 12 }}
                      onClick={() => { setFOwner(st.profile_id); setFSpec(''); setTab('contacts'); setPage(0) }}>
                      شوف أرقامه
                    </button>
                  </div>
                ))}
              </div>
              {ov.staff_no_account.length > 0 && (
                <div style={{ padding: '0 14px 14px', fontSize: 12, color: C.warn }}>
                  ⚠️ {ov.staff_no_account.length} موظفين مالهمش حساب على المنصة فمينفعش يتوزّع عليهم:
                  {' '}<b>{ov.staff_no_account.join(' · ')}</b>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════ الأرقام ══════════ */}
        {tab === 'contacts' && (
          <>
            <div style={{ ...card, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${C.line}`, borderRadius: 12, padding: '6px 10px', flex: '1 1 200px' }}>
                <Search style={{ width: 15, height: 15, color: C.sub }} />
                <input value={q} onChange={e => setQ(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') loadContacts(true) }}
                  placeholder="رقم أو اسم…" style={{ border: 0, outline: 0, flex: 1, fontSize: 13, background: 'transparent', fontFamily: 'inherit' }} />
              </div>
              <select value={fSpec} onChange={e => { setFSpec(e.target.value); setPage(0) }}
                style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit' }}>
                <option value="">كل التخصصات</option>
                <option value="__none__">لسه مش متصنّف</option>
                {(ov?.specialties || []).map(s => <option key={s.key} value={s.key}>{s.name_ar} ({s.contacts})</option>)}
              </select>
              <select value={fOwner} onChange={e => { setFOwner(e.target.value); setPage(0) }}
                style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit' }}>
                <option value="">كل الفريق</option>
                {(ov?.staff || []).map(s => <option key={s.profile_id} value={s.profile_id}>{s.name}</option>)}
              </select>
              <select value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(0) }}
                style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit' }}>
                <option value="">كل الحالات</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button style={btn()} onClick={() => loadContacts(true)}>فلترة</button>
              <button style={btn('primary')} onClick={exportCsv} disabled={!!busy}>
                {busy === 'export' ? <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> : <Download style={{ width: 15, height: 15 }} />}
                صدّر CSV
              </button>
            </div>

            <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 8 }}>
              {total.toLocaleString('ar-EG')} رقم · صفحة {page + 1} من {Math.max(1, Math.ceil(total / PAGE))}
            </div>

            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f7f8f6', color: C.sub, fontSize: 11.5 }}>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>الرقم</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>الاسم / البيزنس</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>التخصص</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>المسؤول</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>الحالة</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>آخر تواصل</th>
                      <th style={{ padding: '8px 12px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id} style={{ borderTop: `1px solid ${C.line}` }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, direction: 'ltr', textAlign: 'right' }}>{r.phone}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {r.name || <span style={{ color: C.sub }}>—</span>}
                          {r.business && <div style={{ fontSize: 11, color: C.sub }}>{r.business}</div>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {r.specialty_ar || <span style={{ color: C.warn, fontWeight: 700 }}>مش متصنّف</span>}
                          <div style={{ fontSize: 10.5, color: C.sub }}>{SRC_LABEL[r.specialty_src || 'none'] || r.specialty_src}</div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>{r.owner || <span style={{ color: C.sub }}>—</span>}</td>
                        <td style={{ padding: '10px 12px' }}>{STATUS_LABEL[r.status] || r.status}</td>
                        <td style={{ padding: '10px 12px', fontSize: 11.5, color: C.sub }}>
                          {r.last_contact_at ? sinceLabel(r.last_contact_at) : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                          {r.calls > 0 && <span style={{ fontSize: 11, color: C.sub, marginLeft: 6 }}>{r.calls} مكالمة</span>}
                          <button style={{ ...btn(), padding: '5px 10px', fontSize: 12 }} onClick={() => openDetail(r.id)}>
                            الملف
                          </button>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && !loading && (
                      <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: C.sub }}>مفيش نتايج</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <button style={btn()} disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>السابق</button>
              <button style={btn()} disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)}>التالي</button>
            </div>
          </>
        )}

        {/* ══════════ التاسكات ══════════ */}
        {tab === 'tasks' && (
          <div style={{ display: 'grid', gap: 10 }}>
            {tasks.length === 0 && !loading && (
              <div style={{ ...card, textAlign: 'center', color: C.sub, padding: 32 }}>
                <ListChecks style={{ width: 26, height: 26, margin: '0 auto 10px', color: C.line }} />
                لسه مفيش تاسكات من مكالمات. التاسكات بتتولد لما المارد يفرّغ مكالمة.
              </div>
            )}
            {tasks.map(t => (
              <div key={t.id} style={{ ...card, opacity: t.status === 'done' ? 0.6 : 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 14 }}>{t.title}</b>
                      {t.priority === 'high' && <span style={{ fontSize: 10.5, background: '#fdecea', color: C.danger, padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>عاجل</span>}
                      {t.specialty_ar && <span style={{ fontSize: 10.5, background: '#eef7f3', color: C.green, padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>{t.specialty_ar}</span>}
                    </div>
                    {t.detail && <p style={{ fontSize: 12.5, color: C.sub, margin: '5px 0 0' }}>{t.detail}</p>}
                    <div style={{ fontSize: 11.5, color: C.sub, marginTop: 6 }}>
                      المسؤول: <b style={{ color: C.ink }}>{t.owner || '—'}</b>
                      {t.contact_phone && <> · <span style={{ direction: 'ltr', display: 'inline-block' }}>{t.contact_phone}</span></>}
                      {' · '}{fmtDateTime(t.created_at)}
                    </div>
                    {t.route_reason && (
                      <div style={{ marginTop: 8, fontSize: 12, background: '#eef7f3', border: `1px solid ${C.green2}`, color: C.green, borderRadius: 10, padding: '6px 10px', display: 'flex', gap: 6, alignItems: 'center' }}>
                        <CornerDownLeft style={{ width: 13, height: 13, flexShrink: 0 }} />
                        {t.route_reason}{t.routed_from ? ` (من ${t.routed_from})` : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {t.status !== 'done' && (
                      <button style={{ ...btn('primary'), padding: '6px 10px', fontSize: 12 }}
                        onClick={() => run('crm_task_update', { p_task: t.id, p_status: 'done' }, 'التاسك اتقفل')}>
                        <CheckCircle2 style={{ width: 14, height: 14 }} /> خلص
                      </button>
                    )}
                    {t.contact_id && (
                      <button style={{ ...btn(), padding: '6px 10px', fontSize: 12 }} onClick={() => openDetail(t.contact_id!)}>
                        الملف
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <Loader2 style={{ width: 22, height: 22, color: C.green }} className="animate-spin" />
          </div>
        )}
      </main>

      {/* ══════════ مودال: تخصصات موظف ══════════ */}
      {editStaff && ov && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setEditStaff(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 20, maxWidth: 420, width: '100%' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>تخصصات {editStaff.name}</h3>
            <p style={{ fontSize: 12, color: C.sub, margin: '0 0 14px' }}>الليدات بتاعة التخصصات دي هتتوزّع عليه بالدور.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
              {ov.specialties.filter(s => s.active).map(s => {
                const on = editSpecs.includes(s.key)
                return (
                  <button key={s.key} style={chip(on)}
                    onClick={() => setEditSpecs(v => on ? v.filter(x => x !== s.key) : [...v, s.key])}>
                    {s.name_ar}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...btn('primary'), flex: 1, justifyContent: 'center' }} disabled={!!busy}
                onClick={async () => {
                  await run('crm_set_staff_specialties',
                    { p_profile: editStaff.profile_id, p_specialties: editSpecs, p_primary: editSpecs[0] || null },
                    'التخصصات اتحفظت')
                  setEditStaff(null)
                }}>
                <Save style={{ width: 15, height: 15 }} /> احفظ
              </button>
              <button style={btn()} onClick={() => setEditStaff(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ مودال: ملف العميل ══════════ */}
      {(detail || detailBusy) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}
          onClick={() => setDetail(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 20, maxWidth: 760, width: '100%', margin: '24px 0' }}>
            {detailBusy && <div style={{ textAlign: 'center', padding: 30 }}><Loader2 style={{ width: 22, height: 22, color: C.green }} className="animate-spin" /></div>}
            {detail && (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                      {detail.contact.name || detail.contact.phone}
                    </h3>
                    <div style={{ fontSize: 12.5, color: C.sub, marginTop: 3 }}>
                      <span style={{ direction: 'ltr', display: 'inline-block' }}>{detail.contact.phone}</span>
                      {' · '}{detail.contact.specialty_ar || 'مش متصنّف'}
                      {' · '}{STATUS_LABEL[detail.contact.status] || detail.contact.status}
                      {detail.contact.owner && <> · مسؤوله <b style={{ color: C.ink }}>{detail.contact.owner}</b></>}
                    </div>
                    {detail.contact.business && (
                      <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{detail.contact.business}</div>
                    )}
                  </div>
                  <button style={{ ...btn(), padding: 6 }} onClick={() => setDetail(null)}><X style={{ width: 15, height: 15 }} /></button>
                </div>

                {/* المكالمات */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Phone style={{ width: 15, height: 15, color: C.green }} />
                    <b style={{ fontSize: 13.5 }}>المكالمات المفرّغة ({detail.calls.length})</b>
                  </div>
                  {detail.calls.length === 0
                    ? <p style={{ fontSize: 12.5, color: C.sub, margin: 0 }}>لسه مفيش مكالمة اتفرّغت. المارد بيفرّغ المكالمة ويحطّ التاسكات أوتوماتيك.</p>
                    : detail.calls.map(k => (
                      <div key={k.id} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                        <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 5 }}>
                          {fmtDateTime(k.started_at)} · {k.channel} · {k.staff || '—'}
                          {k.filled_by === 'marid' && <span style={{ marginRight: 6, background: '#eef7f3', color: C.green, padding: '1px 7px', borderRadius: 999, fontWeight: 700 }}>فرّغه المارد</span>}
                        </div>
                        {k.summary && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>{k.summary}</div>}
                        {k.transcript && <p style={{ fontSize: 12.5, color: C.sub, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{k.transcript}</p>}
                      </div>
                    ))}
                </div>

                {/* التاسكات */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <ListChecks style={{ width: 15, height: 15, color: C.green }} />
                    <b style={{ fontSize: 13.5 }}>التاسكات ({detail.tasks.length})</b>
                  </div>
                  {detail.tasks.length === 0
                    ? <p style={{ fontSize: 12.5, color: C.sub, margin: 0 }}>مفيش تاسكات.</p>
                    : detail.tasks.map(t => (
                      <div key={t.id} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 10, marginBottom: 6, opacity: t.status === 'done' ? 0.6 : 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{t.title}</div>
                        <div style={{ fontSize: 11.5, color: C.sub, marginTop: 3 }}>
                          {t.owner || '—'}{t.specialty_ar ? ` · ${t.specialty_ar}` : ''} · {t.status === 'done' ? 'خلص' : 'مفتوح'}
                        </div>
                        {t.route_reason && <div style={{ fontSize: 11.5, color: C.green, marginTop: 4 }}>↩ {t.route_reason}</div>}
                      </div>
                    ))}
                </div>

                {/* آخر الرسايل */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <b style={{ fontSize: 13.5 }}>آخر الرسايل ({detail.messages.length})</b>
                  </div>
                  <div style={{ maxHeight: 260, overflowY: 'auto', display: 'grid', gap: 6 }}>
                    {detail.messages.length === 0 && <p style={{ fontSize: 12.5, color: C.sub, margin: 0 }}>مفيش رسايل متسجّلة على الرقم ده.</p>}
                    {detail.messages.map((m, i) => (
                      <div key={i} style={{
                        fontSize: 12.5, padding: '7px 10px', borderRadius: 10, lineHeight: 1.7,
                        background: m.dir === 'inbound' ? '#f4f6f4' : '#eef7f3',
                        border: `1px solid ${C.line}`,
                      }}>
                        <div style={{ fontSize: 10.5, color: C.sub, marginBottom: 2 }}>
                          {m.dir === 'inbound' ? 'منه' : 'منّنا'} · {fmtDateTime(m.at)}
                        </div>
                        {m.body}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
