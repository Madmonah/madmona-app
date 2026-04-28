import { createClient } from '@supabase/supabase-js'

// Anonymous client for public storage reads (no auth needed for public bucket).
// We use a fresh anon client here instead of importing the admin client because
// listing files in a public bucket doesn't require service-role access — and
// keeping the admin client out of public-facing helpers reduces risk.
const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STORAGE_BUCKET = 'space-images'
const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}`

/**
 * List image URLs for a given space slug from the Supabase Storage bucket.
 *
 * Convention: files in the bucket are named like:
 *   indoor-coworking-1.jpg, indoor-coworking-2.jpg, ...
 *   outdoor-garden-1.jpg, ...
 *
 * Returns an empty array if no images exist or on any error — callers should
 * gracefully fall back to a placeholder UI when the array is empty.
 */
export async function listSpaceImages(slug: string): Promise<string[]> {
  try {
    const { data, error } = await supabasePublic.storage.from(STORAGE_BUCKET).list('', {
      limit: 100,
      search: slug,
    })

    if (error || !data) return []

    // Filter to actual images for this slug (defensive: search may return prefix matches)
    const matching = data
      .filter((file) => file.name.startsWith(`${slug}-`) || file.name.startsWith(`${slug}.`))
      .filter((file) => /\.(jpe?g|png|webp|avif)$/i.test(file.name))
      .sort((a, b) => a.name.localeCompare(b.name))

    return matching.map((file) => `${STORAGE_BASE}/${encodeURIComponent(file.name)}`)
  } catch {
    return []
  }
}
