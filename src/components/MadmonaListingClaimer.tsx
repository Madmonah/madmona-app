'use client'

import { safeStorage } from '@/lib/safe-storage'

// ============================================================================
// MadmonaListingClaimer
//
// Watches every page navigation for ?token=<draft-token> in the URL. If a
// signed-in user is found and a token is present (but we're NOT inside the
// /add-listing wizard itself), it POSTs to /api/listing-drafts/claim to
// convert the anonymous draft into a real supplier + listing for that user.
//
// Drop once into the root layout — no need to edit the signup page.
// ============================================================================

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

const CLAIMED_KEY = 'madmona_claimed_tokens'

export default function MadmonaListingClaimer() {
  const params = useSearchParams()
  const pathname = usePathname()

  useEffect(() => {
    const token = params?.get('token')
    if (!token) return

    // Inside the wizard itself, ?token=... means "resume draft", not "claim"
    if (pathname?.startsWith('/add-listing')) return

    // Don't re-claim the same token in the same browser
    try {
      const claimed: string[] = JSON.parse(safeStorage.get(CLAIMED_KEY) || '[]')
      if (claimed.includes(token)) return
    } catch {}

    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabaseBrowser.auth.getUser()
        if (cancelled || !user) return // user must be signed in for claim to succeed

        const res = await fetch('/api/listing-drafts/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, profile_id: user.id }),
        })
        const json = await res.json()
        if (cancelled) return

        if (json?.success) {
          try {
            const claimed: string[] = JSON.parse(safeStorage.get(CLAIMED_KEY) || '[]')
            claimed.push(token)
            safeStorage.set(CLAIMED_KEY, JSON.stringify(claimed))
          } catch {}

          // ALSO claim any other unclaimed drafts under the same phone number.
          // Catches the case where a user submitted multiple drafts (e.g.
          // 3 cars on different days) — token-based claim only handles one.
          try {
            const { data: profile } = await supabaseBrowser
              .from('profiles')
              .select('phone')
              .eq('id', user.id)
              .single()
            const phone = (profile as { phone?: string } | null)?.phone
            if (phone) {
              await fetch('/api/listing-drafts/claim-by-phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, profile_id: user.id }),
              })
            }
          } catch (e) {
            console.warn('[MadmonaListingClaimer] phone-bulk-claim skipped:', e)
          }

          // Friendly toast confirming the listing is linked
          const banner = document.createElement('div')
          banner.style.cssText = [
            'position:fixed', 'bottom:24px', 'left:50%',
            'transform:translateX(-50%)',
            'background:#2B4521', 'color:#FAF7F0',
            'padding:16px 24px', 'border-radius:14px',
            'box-shadow:0 12px 30px rgba(0,0,0,0.35)',
            'z-index:9999', 'font-family:system-ui,sans-serif',
            'font-size:14px', 'direction:rtl', 'text-align:center',
            'max-width:90vw', 'border:1px solid rgba(250, 129, 37,0.4)',
          ].join(';')
          banner.innerHTML =
            '🎉 <strong>تم ربط إعلانك بحسابك!</strong><br>' +
            '<span style="opacity:.85;font-size:12px">' +
            'إعلانك دلوقتي قيد المراجعة — هتلاقيه في لوحة التحكم</span>'
          document.body.appendChild(banner)
          setTimeout(() => banner.remove(), 6000)
        }
      } catch (e) {
        // Silent failure — won't break the user's session
        console.warn('[MadmonaListingClaimer] claim failed:', e)
      }
    })()

    return () => { cancelled = true }
  }, [params, pathname])

  return null
}
