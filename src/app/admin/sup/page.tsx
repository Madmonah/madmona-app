'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

interface Supplier {
  id: string
  business_name: string
  kyc_status: string
  listings_count: number
  bookings_count: number
  created_at: string
  profile: { full_name: string | null; phone: string | null } | null
}

export default function SimpleSuppliersPage() {
  const [state, setState] = useState<'loading' | 'unauth' | 'forbidden' | 'ready' | 'error'>('loading')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (!session?.user) { setState('unauth'); return }

        // @ts-expect-error
        const { data, error } = await supabaseBrowser.rpc('get_marketplace_suppliers_admin')
        if (error) {
          const msg = (error.message || '').toLowerCase()
          if (msg.includes('forbidden')) { setState('forbidden'); return }
          if (msg.includes('unauthenticated')) { setState('unauth'); return }
          setErrorMsg(error.message); setState('error'); return
        }
        setSuppliers((data as Supplier[]) || [])
        setState('ready')
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'error')
        setState('error')
      }
    })()
  }, [])

  const updateStatus = async (id: string, kycStatus: string, reason?: string) => {
    // @ts-expect-error
    const { error } = await supabaseBrowser.rpc('update_supplier_kyc_admin', {
      p_supplier_id: id,
      p_kyc_status: kycStatus,
      p_rejection_reason: reason || null,
    })
    if (error) { alert('فشل: ' + error.message); return }
    location.reload()
  }

  if (state === 'loading') return <div style={{padding:40,textAlign:'center'}}>⏳ بنحمل...</div>
  if (state === 'unauth') return <div style={{padding:40,textAlign:'center'}}><p>سجل دخول الأول</p><a href="/auth/login?redirect=/admin/sup">دخول</a></div>
  if (state === 'forbidden') return <div style={{padding:40,textAlign:'center'}}>صفحة الأدمن بس</div>
  if (state === 'error') return <div style={{padding:40,textAlign:'center'}}><p style={{color:'red'}}>{errorMsg}</p></div>

  return (
    <div dir="rtl" style={{padding:20,maxWidth:900,margin:'0 auto',fontFamily:'system-ui, sans-serif'}}>
      <h1 style={{fontSize:20,fontWeight:'bold',marginBottom:16}}>👨‍💼 الموردين ({suppliers.length})</h1>
      
      {suppliers.length === 0 ? (
        <p>مفيش موردين</p>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {suppliers.map(s => (
            <div key={s.id} style={{
              background:'white',
              border:'1px solid #ddd',
              borderRadius:8,
              padding:16,
              borderRight: `4px solid ${
                s.kyc_status === 'approved' ? '#22c55e' :
                s.kyc_status === 'pending' ? '#f59e0b' :
                s.kyc_status === 'rejected' ? '#ef4444' : '#6b7280'
              }`
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <strong style={{fontSize:16}}>🏪 {s.business_name}</strong>
                <span style={{
                  padding:'4px 12px',
                  borderRadius:12,
                  fontSize:11,
                  background:
                    s.kyc_status === 'approved' ? '#dcfce7' :
                    s.kyc_status === 'pending' ? '#fef3c7' :
                    s.kyc_status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                  color:
                    s.kyc_status === 'approved' ? '#166534' :
                    s.kyc_status === 'pending' ? '#854d0e' :
                    s.kyc_status === 'rejected' ? '#991b1b' : '#374151'
                }}>
                  {s.kyc_status === 'approved' ? '✅ معتمد' :
                   s.kyc_status === 'pending' ? '⏳ معلق' :
                   s.kyc_status === 'rejected' ? '❌ مرفوض' : '🚫 موقوف'}
                </span>
              </div>
              {s.profile?.full_name && <div style={{fontSize:13,color:'#666'}}>👤 {s.profile.full_name}</div>}
              {s.profile?.phone && (
                <div style={{fontSize:13,color:'#666'}}>
                  📱 <a href={`https://wa.me/${s.profile.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{color:'#16a34a'}}>{s.profile.phone}</a>
                </div>
              )}
              <div style={{fontSize:13,color:'#666',marginTop:6}}>
                📦 {s.listings_count} إعلان · 📅 {s.bookings_count} حجز
              </div>
              <div style={{display:'flex',gap:8,marginTop:12}}>
                {s.kyc_status === 'pending' && (
                  <>
                    <button onClick={() => { if(confirm('موافقة؟')) updateStatus(s.id, 'approved') }}
                      style={{background:'#22c55e',color:'white',padding:'6px 14px',borderRadius:6,border:'none',fontSize:12,cursor:'pointer'}}>
                      ✅ موافقة
                    </button>
                    <button onClick={() => { const r = prompt('سبب الرفض:'); if(r !== null) updateStatus(s.id, 'rejected', r || 'مرفوض') }}
                      style={{background:'#ef4444',color:'white',padding:'6px 14px',borderRadius:6,border:'none',fontSize:12,cursor:'pointer'}}>
                      ❌ رفض
                    </button>
                  </>
                )}
                {s.kyc_status === 'approved' && (
                  <button onClick={() => { if(confirm('إيقاف؟')) updateStatus(s.id, 'suspended') }}
                    style={{background:'#6b7280',color:'white',padding:'6px 14px',borderRadius:6,border:'none',fontSize:12,cursor:'pointer'}}>
                    🚫 إيقاف
                  </button>
                )}
                {(s.kyc_status === 'rejected' || s.kyc_status === 'suspended') && (
                  <button onClick={() => { if(confirm('إعادة تفعيل؟')) updateStatus(s.id, 'approved') }}
                    style={{background:'#22c55e',color:'white',padding:'6px 14px',borderRadius:6,border:'none',fontSize:12,cursor:'pointer'}}>
                    ✅ إعادة تفعيل
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
