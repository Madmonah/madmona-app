// src/lib/geo.ts
// ============================================================================
// 📍 (٦/٩/٢٠٢٦) parseLatLng اتنقلت هنا من LocationPicker — الكومبوننت 'use client'
//    واستيراده في راوت سيرفر (/api/geo/resolve) كان بيرمي 500. الدالة نقية:
//    بتقرا إحداثيات من لينك خرايط جوجل أو من نص «lat,lng». LocationPicker بيعيد تصديرها.
// ============================================================================

export interface LatLng {
  latitude: number | null
  longitude: number | null
}

/**
 * بيطلّع الإحداثيات من لينك خرايط جوجل بأشكاله المختلفة:
 *   .../@30.0444,31.2357,17z
 *   ...?q=30.0444,31.2357
 *   .../place/.../data=!3d30.0444!4d31.2357
 *   30.0444, 31.2357   (لصق مباشر)
 * بنرجّع null لو مفيش، أو لو الرقم بره حدود الأرض.
 */
export function parseLatLng(input: string): LatLng | null {
  if (!input) return null
  const text = input.trim()

  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,          // /@lat,lng
    /[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,   // ?q=lat,lng
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,       // !3dlat!4dlng
    /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/,    // لصق مباشر
  ]

  for (const re of patterns) {
    const m = text.match(re)
    if (!m) continue
    const lat = Number(m[1])
    const lng = Number(m[2])
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue
    return { latitude: lat, longitude: lng }
  }
  return null
}
