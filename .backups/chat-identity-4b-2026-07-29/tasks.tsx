'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'

type Task = { id: string; title: string; detail: string | null; assignee_name: string | null; priority: string; status: string; created_at: string }

const PR: Record<string, { c: string; b: string; l: string }> = {
  high: { c: '#b91c1c', b: '#fee2e2', l: 'عالية' },
  medium: { c: '#b45309', b: '#fef3c7', l: 'متوسطة' },
  low: { c: '#047857', b: '#d1fae5', l: 'منخفضة' },
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
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg,#eef2f5,#e2e8ee)', fontFamily: "'Cairo', system-ui, sans-serif" }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');"}</style>
      <header style={{ background: 'linear-gradient(135deg,#0a7d6e,#075E54)', color: '#fff', padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,.18)' }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>📋 مهامي</div>
        <div style={{ fontSize: 12, opacity: .85 }}>{tasks.length} مهمة مفتوحة</div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {!ready && <div style={{ color: '#667', padding: 16 }}>لحظة…</div>}
        {ready && !authed && <div style={{ color: '#667', padding: 24, textAlign: 'center' }}>لازم تسجّل دخول الأول.</div>}
        {ready && authed && tasks.length === 0 && <div style={{ color: '#667', padding: 24, textAlign: 'center' }}>مفيش مهام مفتوحة 🎉</div>}
        {tasks.map((t) => {
          const p = PR[t.priority] || PR.medium
          return (
            <div key={t.id} style={{ background: '#fff', borderRadius: 14, padding: 12, marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <button onClick={() => done(t.id)} title="خلّصت" style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #22c55e', background: '#fff', color: '#22c55e', cursor: 'pointer', fontSize: 14, flexShrink: 0, lineHeight: 1 }}>✓</button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.title}</div>
                {t.detail && <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t.detail}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, background: p.b, color: p.c, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{p.l}</span>
                  {t.assignee_name && <span style={{ fontSize: 12, color: '#475569' }}>👤 {t.assignee_name}</span>}
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
