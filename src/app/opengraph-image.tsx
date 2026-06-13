export const runtime = 'edge'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt = 'مضمونة - معاملاتك مضمونة'

// Serve the pre-rendered Cloudinary card; next/og could not render Arabic on edge (returned an empty image).
export default async function OpenGraphImage() {
  const res = await fetch('https://res.cloudinary.com/duxfgqioc/image/upload/v1781334723/madmona/og-card.png', { cache: 'no-store' })
  const buf = await res.arrayBuffer()
  return new Response(buf, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } })
}
