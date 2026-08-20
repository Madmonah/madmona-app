'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'

/* ============================================================================
   /chat/company — تاب «جروب» — جروب شركة لكل بيزنس
   ============================================================================
   🎯 (٢٠ أغسطس ٢٠٢٦) محمد:
      «يتضاف تاب محادثة في شات المارد تحت تاب جروب يكون مكتوب فيه
       جروب شركة ..... والجروب ده يكون فيه كل موظفين الشركة الواحدة
       سواء مضمونة أو غيرها».

   الجروب ده مش زي جروبات «فريق العمل» العادية:
     • بيتعمل لوحده لكل بيزنس (`sync_company_group` في الداتابيز)
     • عضويته من **الشغل** مش من الصداقة — كل موظف نشط له حساب دخول
       بيدخله أوتوماتيك أول ما حسابه يتعمل
     • `chat_rooms.kind = 'company'` + `chat_rooms.supplier_id`

   ⚠️ فصلناه عن تاب «جروبات» عن قصد: `chat_rooms_for_me('group')` كانت
   بترجّع **أي حاجة مش direct**، فجروبات الشركات كانت هتتسرّب هناك.
   دلوقتي فيه `p_kind='company'` لوحده.

   شاشة العرض نفسها هي شاشة الجروبات (`/chat/team?room=...`) — مفيش
   تكرار لـ١٤٠٠ سطر من الشات.
   ============================================================================ */

type Room = { id: string; name: string; last: string; time: string }

function fmtTime(iso?: string | null) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

export default function CompanyGroupsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (!session?.user) { setLoading(false); return }
        setLoggedIn(true)

        const { data } = await (supabaseBrowser.rpc as unknown as (
          fn: string, args: Record<string, unknown>,
        ) => Promise<{ data: Array<{ id: string; name: string | null; last_body: string | null; last_at: string | null }> | null }>)(
          'chat_rooms_for_me', { p_kind: 'company' },
        )

        setRooms((data || []).map(r => ({
          id: r.id,
          name: r.name || 'جروب شركة',
          last: (r.last_body || 'لسه محدش كتب حاجة — ابدأ انت').slice(0, 55),
          time: fmtTime(r.last_at),
        })))
      } catch (e) {
        console.error('[chat/company] load failed:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div dir="rtl" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#FAFAF7', fontFamily: 'var(--font-cairo), system-ui, sans-serif' }}>
      <header style={{ background: 'linear-gradient(135deg,#14231E,#059669)', color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 14px rgba(20,35,30,.28)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>جروب الشركة</div>
          <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600, marginTop: 2 }}>كل موظفين الشركة في مكان واحد</div>
        </div>
        <Link href="/chat/settings" aria-label="إعدادات" style={{ color: 'rgba(255,255,255,.85)', fontSize: 20, textDecoration: 'none' }}>⚙️</Link>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '2px 0' }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ ...rowStyle, opacity: 1 - i * 0.3 }}>
                <div style={{ ...avatarStyle, background: '#E8E4DA' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ height: 12, width: '45%', background: '#E8E4DA', borderRadius: 6, marginBottom: 9 }} />
                  <div style={{ height: 10, width: '70%', background: '#EFECE3', borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div style={{ padding: '24px 16px', fontSize: 13, color: '#8A9690', fontWeight: 600, lineHeight: 1.9, textAlign: 'center' }}>
            {loggedIn ? (
              <>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🏢</div>
                لسه مالكش جروب شركة.
                <br />
                الجروب بيتعمل لوحده أول ما تتضاف كموظف في شركة على مضمونة.
              </>
            ) : (
              'سجّل دخولك علشان تشوف جروب شركتك.'
            )}
          </div>
        ) : (
          rooms.map((r) => (
            <Link key={r.id} href={`/chat/team?room=${r.id}`} style={{ ...rowStyle, background: '#fff' }}>
              <div style={{ ...avatarStyle, background: 'linear-gradient(135deg,#D4A017,#2FA084)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 20 }}>
                🏢
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 900, color: '#14231E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                  <span style={{ fontSize: 11, color: '#8A9690', fontWeight: 600, flexShrink: 0 }}>{r.time}</span>
                </div>
                <div style={{ fontSize: 13, color: '#5A6660', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.last}</div>
              </div>
            </Link>
          ))
        )}
      </div>

      <ChatBottomNav />
    </div>
  )
}

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', textDecoration: 'none', borderBottom: '1px solid #F4F1E8' }
const avatarStyle: React.CSSProperties = { width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#fff' }
