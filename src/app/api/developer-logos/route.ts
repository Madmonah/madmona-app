import { NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import { join } from 'path'

// ============================================================================
// GET /api/developer-logos
//
// Dynamically reads /public/developers/ and returns the list of logo files
// found there. Drop a new logo file in that folder (png/svg/webp/jpg) and it
// shows up automatically — no code change or redeploy of this route needed.
// Remove a file and it disappears. Fully data-driven from the filesystem.
// ============================================================================

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const ALLOWED = ['.png', '.svg', '.webp', '.jpg', '.jpeg', '.avif']

export async function GET() {
  try {
    const dir = join(process.cwd(), 'public', 'developers')
    let files: string[] = []
    try {
      files = await readdir(dir)
    } catch {
      // folder missing or empty -> return empty list gracefully
      return NextResponse.json({ logos: [] }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      })
    }

    const logos = files
      .filter((f) => {
        const lower = f.toLowerCase()
        if (f.startsWith('.') || f.startsWith('_')) return false
        return ALLOWED.some((ext) => lower.endsWith(ext))
      })
      .sort((a, b) => a.localeCompare(b))
      .map((f) => ({
        src: `/developers/${f}`,
        name: f.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
      }))

    return NextResponse.json({ logos }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (e) {
    return NextResponse.json({ logos: [] }, { status: 200 })
  }
}
