export const runtime = 'edge'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt = 'مضمونة - معاملاتك مضمونة'

// Serve the pre-rendered card from our own /public folder; next/og could not render Arabic on edge (returned an empty image).
export default async function OpenGraphImage() {
  const res = await fetch(new URL('/og-image-v2.png', 'https://madmonacairo.com'), { cache: 'no-store' })
  const buf = await res.arrayBuffer()
  return new Response(buf, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } })
}
