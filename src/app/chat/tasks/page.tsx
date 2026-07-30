'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'

type Task = { id: string; title: string; detail: string | null; assignee_name: string | null; priority: string; status: string; created_at: string }

// ألوان الأولوية بهوية مضمونة 4b: عالية مرجاني · متوسطة دهبي · منخفضة أخضر
const PR: Record<string, { c: string; b: string; l: string }> = {
  high: { c: '#E26D5C', b: '#FDEBE8', l: 'عالية' },
  medium: { c: '#B78A12', b: '#FBF3DC', l: 'متوسطة' },
  low: { c: '#1F6F5F', b: '#E3F4EE', l: 'منخفضة' },
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [token, setToken] = useState('')
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)

  const load = useCallback(async (tok: string) => {
    try { const r = await fetch('/api/team/tasks', { headers: { Authorization: `Bearer ${tok}` }, cache: 'no-store' }); const d = await r.json(); if (d?.ok) setTasks(d.tasks || []) } catch {}
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (session?.user) { setAuthed(true); setToken(session.access_token); await load(session.access_token) }
      setReady(true)
    })()
  }, [load])

  async function done(id: string) {
    setTasks((t) => t.filter((x) => x.id !== id))
    try { await fetch('/api/team/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ taskId: id }) }) } catch {}
  }

  return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F1EEE6', backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, rgba(31,111,95,.07) 1.5px, transparent 0)', backgroundSize: '26px 26px', fontFamily: "var(--font-cairo), system-ui, sans-serif" }}>
      <header style={{ background: 'linear-gradient(135deg,#14231E,#1F6F5F)', color: '#fff', padding: '14px 16px', boxShadow: '0 2px 14px rgba(20,35,30,.28)' }}>
        <div style={{ fontWeight: 900, fontSize: 17 }}>📋 مهامي</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#6FCF97' }}>{tasks.length} مهمة مفتوحة</div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {!ready && <div style={{ color: '#5A6660', padding: 16, fontWeight: 600 }}>لحظة…</div>}
        {ready && !authed && <div style={{ color: '#5A6660', padding: 24, textAlign: 'center', fontWeight: 600 }}>لازم تسجّل دخول الأول.</div>}
        {ready && authed && tasks.length === 0 && <div style={{ color: '#5A6660', padding: 24, textAlign: 'center', fontWeight: 600 }}>مفيش مهام مفتوحة 🎉</div>}
        {tasks.map((t) => {
          const p = PR[t.priority] || PR.medium
          return (
            <div key={t.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #EAE5D9', padding: 12, marginBottom: 10, boxShadow: '0 1px 2px rgba(20,35,30,.06)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <button onClick={() => done(t.id)} title="خلّصت" style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #2FA084', background: '#fff', color: '#2FA084', cursor: 'pointer', fontSize: 14, flexShrink: 0, lineHeight: 1 }}>✓</button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: '#14231E' }}>{t.title}</div>
                {t.detail && <div style={{ fontSize: 13, color: '#5A6660', fontWeight: 600, marginTop: 2 }}>{t.detail}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 10.5, background: p.b, color: p.c, padding: '2px 9px', borderRadius: 20, fontWeight: 800 }}>{p.l}</span>
                  {t.assignee_name && <span style={{ fontSize: 12, color: '#5A6660', fontWeight: 600 }}>👤 {t.assignee_name}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <ChatBottomNav />
    </div>
  )
}
