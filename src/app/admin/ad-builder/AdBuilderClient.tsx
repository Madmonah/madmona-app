'use client'

// src/app/admin/ad-builder/AdBuilderClient.tsx
// Interactive ad URL builder + listing picker

import { useState, useMemo } from 'react'

interface ListingExtras {
  id: string
  title: string
  slug: string
  city: string | null
  district: string | null
  rating: number | null
  bookings_count: number
  views_count: number
  category_name: string | null
  hero_photo: string | null
  lowest_price: number | null
}

const SITE = 'https://www.madmonacairo.com'

export default function AdBuilderClient({ listings }: { listings: ListingExtras[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [utmSource, setUtmSource] = useState<'facebook' | 'instagram' | 'google'>('facebook')
  const [copied, setCopied] = useState<string | null>(null)

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return listings
    return listings.filter(l =>
      l.title.toLowerCase().includes(q) ||
      l.category_name?.toLowerCase().includes(q) ||
      l.city?.toLowerCase().includes(q) ||
      l.district?.toLowerCase().includes(q)
    )
  }, [listings, search])

  const selected = listings.find(l => l.slug === selectedSlug)

  const generalLink = useMemo(() => {
    const cn = campaignName.trim() || 'general'
    return `${SITE}/ad-landing?utm_source=${utmSource}&utm_campaign=${encodeURIComponent(cn)}`
  }, [campaignName, utmSource])

  const listingLink = useMemo(() => {
    if (!selected) return null
    const cn = campaignName.trim() || `listing_${selected.slug}`
    return `${SITE}/ad-listing/${selected.slug}?utm_source=${utmSource}&utm_campaign=${encodeURIComponent(cn)}`
  }, [selected, campaignName, utmSource])

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div>
      {/* Step 1: Campaign settings */}
      <div style={cardStyle}>
        <h3 style={{ color: '#1F5F3F', margin: '0 0 12px' }}>1️⃣ إعدادات الـ Campaign</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>اسم الـ Campaign</label>
            <input
              type="text"
              placeholder="مثل: cameras_october, ads_apartments_q4"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>المصدر</label>
            <select
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value as 'facebook' | 'instagram' | 'google')}
              style={inputStyle}
            >
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="google">Google</option>
            </select>
          </div>
        </div>

        {/* General landing link */}
        <div style={{
          background: '#FAF7F0',
          padding: 12,
          borderRadius: 8,
          marginTop: 12,
          border: '1px dashed #1F5F3F',
        }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
            🌐 لينك عام (لما الـ ad مش عن إعلان معين):
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{
              flex: 1,
              fontSize: 11,
              background: '#fff',
              padding: '6px 10px',
              borderRadius: 4,
              direction: 'ltr',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{generalLink}</code>
            <button
              onClick={() => copy(generalLink, 'general')}
              style={copyBtnStyle(copied === 'general')}
            >
              {copied === 'general' ? '✓ تم!' : '📋 انسخ'}
            </button>
          </div>
        </div>
      </div>

      {/* Step 2: Pick a listing */}
      <div style={cardStyle}>
        <h3 style={{ color: '#1F5F3F', margin: '0 0 12px' }}>2️⃣ اختار إعلان (اختياري)</h3>
        <input
          type="text"
          placeholder="🔍 ابحث في الإعلانات..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, marginBottom: 12 }}
        />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
          maxHeight: 480,
          overflowY: 'auto',
          padding: 4,
        }}>
          {filteredListings.length === 0 ? (
            <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#999' }}>مفيش إعلانات مطابقة</p>
          ) : (
            filteredListings.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedSlug(selectedSlug === l.slug ? null : l.slug)}
                style={{
                  background: selectedSlug === l.slug ? '#1F5F3F' : '#fff',
                  color: selectedSlug === l.slug ? '#FAF7F0' : '#1a1a1a',
                  border: `2px solid ${selectedSlug === l.slug ? '#1F5F3F' : '#eee'}`,
                  borderRadius: 12,
                  padding: 10,
                  textAlign: 'right',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  overflow: 'hidden',
                }}
              >
                {l.hero_photo && (
                  <div style={{
                    width: '100%',
                    aspectRatio: '16/10',
                    background: `url(${l.hero_photo}) center/cover`,
                    borderRadius: 8,
                    marginBottom: 8,
                  }} />
                )}
                <div style={{
                  fontWeight: 'bold',
                  fontSize: 13,
                  lineHeight: 1.3,
                  marginBottom: 4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>{l.title}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>
                  {l.category_name && <span>📦 {l.category_name}</span>}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                  {l.lowest_price ? `${l.lowest_price.toLocaleString()}ج · ` : ''}
                  {l.bookings_count > 0 && `${l.bookings_count} حجز`}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Step 3: Generated link for listing */}
      {selected && listingLink && (
        <div style={{
          ...cardStyle,
          background: '#1F5F3F',
          color: '#FAF7F0',
        }}>
          <h3 style={{ margin: '0 0 12px', color: '#FAF7F0' }}>3️⃣ الـ Ad Link جاهز ✨</h3>
          <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.9 }}>
            انسخ ده وحطه في Meta Ads Manager كـ <strong>Destination URL</strong>:
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: 12,
            borderRadius: 8,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}>
            <code style={{
              flex: 1,
              fontSize: 12,
              direction: 'ltr',
              wordBreak: 'break-all',
              color: '#FAF7F0',
            }}>{listingLink}</code>
            <button
              onClick={() => copy(listingLink, 'listing')}
              style={{
                background: '#B8860B',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {copied === 'listing' ? '✓ تم!' : '📋 انسخ'}
            </button>
          </div>

          <div style={{ marginTop: 16, fontSize: 12, opacity: 0.85, lineHeight: 1.7 }}>
            <strong>👁️ Preview:</strong>{' '}
            <a href={listingLink} target="_blank" rel="noopener" style={{ color: '#B8860B', textDecoration: 'underline' }}>
              افتح الصفحة في تاب جديد
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  padding: 20,
  borderRadius: 12,
  marginBottom: 16,
  border: '1px solid #eee',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: '#666',
  marginBottom: 4,
  fontWeight: 'bold',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '2px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const copyBtnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? '#28a745' : '#1F5F3F',
  color: '#fff',
  border: 'none',
  padding: '6px 14px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 'bold',
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
})
