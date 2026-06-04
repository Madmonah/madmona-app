'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, ShieldAlert, LogIn, Lock, Eye } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// Madmona platform-admin (Supabase Auth) — lets an admin who opened these pages
// from the Madmona dashboard through WITHOUT the owner WhatsApp login.
async function isPlatformAdmin(): Promise<boolean> {
  try {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.user) return false
    // @ts-expect-error rpc typing
    const { data: ok } = await supabaseBrowser.rpc('is_admin')
    return ok === true
  } catch { return false }
}

/* ============================================================
   Auth guard for /admin/business-finance/[supplierId]/*
   Only a Madmona platform admin OR the owner/manager of this
   supplier (e.g. Ahmed for Elite) may view these pages.
   Protects the index AND all sub-pages in one place.
   ============================================================ */

export default function BusinessFinanceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { supplierId: string }
}) {
  const { supplierId } = params
  const [state, setState] = useState<'checking' | 'allowed' | 'no_session' | 'denied'>('checking')
  const [readonly, setReadonly] = useState(false)
  const [blockedToast, setBlockedToast] = useState(false)

  useEffect(() => {
    (async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('madmona_token') : null
      // 1) Owner/manager path (WhatsApp-OTP token) — e.g. Ahmed for Elite
      if (token) {
        // @ts-expect-error rpc typing
        const { data } = await supabase.rpc('admin_check_finance_access', {
          p_token: token, p_supplier_id: supplierId,
        })
        if (data?.allowed) { setReadonly(data.readonly === true); setState('allowed'); return }
        // 2) Madmona platform-admin bypass (came from the dashboard)
        if (await isPlatformAdmin()) { setState('allowed'); return }
        setState(data?.reason === 'no_session' ? 'no_session' : 'denied')
        return
      }
      // No owner token — still let a logged-in Madmona admin straight through
      if (await isPlatformAdmin()) { setState('allowed'); return }
      setState('no_session')
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [supplierId])

  // ── View-only mode: block every write at the network layer so NO edit gets
  //    through anywhere in the dashboard (covers all ~50 tabs from one place).
  //    Blocks admin_* mutation RPCs + any direct table write; reads pass through.
  useEffect(() => {
    if (state !== 'allowed' || !readonly || typeof window === 'undefined') return
    const orig = window.fetch
    const isWrite = (url: string, method: string) => {
      try {
        if (!/\/rest\/v1\//.test(url)) return false
        const m = (method || 'GET').toUpperCase()
        const rpc = url.match(/\/rest\/v1\/rpc\/([a-z0-9_]+)/i)
        if (rpc) {
          const fn = rpc[1].toLowerCase()
          if (fn.startsWith('admin_')) return !/^admin_(get_|list_|check_|dashboard_|drafts_)/.test(fn)
          return false
        }
        return !(m === 'GET' || m === 'HEAD')
      } catch { return false }
    }
    window.fetch = function (input: any, init?: any) {
      const url = typeof input === 'string' ? input : (input?.url ?? '')
      const method = init?.method ?? (typeof input === 'object' ? input?.method : 'GET')
      if (isWrite(url, method)) {
        try { window.dispatchEvent(new CustomEvent('madmona-readonly-blocked')) } catch {}
        return Promise.resolve(new Response(
          JSON.stringify({ message: 'وضع العرض فقط — غير مسموح بالتعديل', code: 'readonly_mode' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        ))
      }
      return orig(input as any, init)
    }
    return () => { window.fetch = orig }
  }, [state, readonly])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const h = () => { setBlockedToast(true); setTimeout(() => setBlockedToast(false), 2600) }
    window.addEventListener('madmona-readonly-blocked', h)
    return () => window.removeEventListener('madmona-readonly-blocked', h)
  }, [])

  if (state === 'checking') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" />
      </div>
    )
  }

  if (state === 'allowed') {
    if (!readonly) return <>{children}</>
    return (
      <div>
        <div className="sticky top-0 z-50 bg-amber-400 text-[#1A2E26] text-center text-[12px] font-black py-2 px-3 flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" /> وضع العرض فقط — مسموح تتفرّج، التعديل مقفول
        </div>
        {children}
        {blockedToast && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] bg-[#1A2E26] text-white text-[13px] font-bold px-4 py-2.5 rounded-2xl shadow-lg">
            🔒 التعديل مقفول — وضع العرض فقط
          </div>
        )}
      </div>
    )
  }

  // Gate screen (no session or not authorized)
  return (
    <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-white grid place-items-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-[#1F6F5F]" />
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {state === 'no_session' ? (
            <>
              <h1 className="text-xl font-black text-[#1A2E26] mb-2">صفحة خاصة بالإدارة</h1>
              <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
                لازم تسجّل دخول الأول عشان تشوف الصفحة دي. الدخول بالموبايل + كود واتساب.
              </p>
              <Link href="/login" className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> تسجيل الدخول
              </Link>
            </>
          ) : (
            <>
              <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h1 className="text-xl font-black text-[#1A2E26] mb-2">مالكش صلاحية</h1>
              <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
                حسابك مش مصرّح له بدخول لوحة الإدارة دي. لو ده غلط، تواصل مع إدارة مضمونة.
              </p>
              <Link href="/home" className="w-full py-3 rounded-xl bg-[#FAFAF7] text-[#1A2E26] font-bold text-sm flex items-center justify-center gap-2 border border-gray-200">
                ارجع لحسابك
              </Link>
            </>
          )}
        </div>
        <p className="text-center text-[10px] text-white/60 mt-6">madmonacairo.com · إدارة</p>
      </div>
    </div>
  )
}
