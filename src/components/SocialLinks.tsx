import {
  Instagram, Facebook, Linkedin, Youtube, Twitter,
  Music2, AtSign,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// SocialLinks — Renders social media icons based on /admin/site-settings URLs
// SMART HIDING: only shows icons for platforms that have a non-empty URL
// Use in Footer, Contact section, Mobile drawer, etc.
// ============================================================================

interface SocialLink {
  key: string
  label: string
  icon: React.ReactNode
  bgColor: string
  hoverColor: string
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    key: 'social_instagram_url',
    label: 'Instagram',
    icon: <Instagram className="w-4 h-4 md:w-5 md:h-5" />,
    bgColor: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    hoverColor: 'hover:from-purple-600 hover:via-pink-600 hover:to-orange-500',
  },
  {
    key: 'social_facebook_url',
    label: 'Facebook',
    icon: <Facebook className="w-4 h-4 md:w-5 md:h-5" />,
    bgColor: 'bg-[#1877F2]',
    hoverColor: 'hover:bg-[#0d65d9]',
  },
  {
    key: 'social_tiktok_url',
    label: 'TikTok',
    icon: <Music2 className="w-4 h-4 md:w-5 md:h-5" />,
    bgColor: 'bg-black',
    hoverColor: 'hover:bg-gray-800',
  },
  {
    key: 'social_youtube_url',
    label: 'YouTube',
    icon: <Youtube className="w-4 h-4 md:w-5 md:h-5" />,
    bgColor: 'bg-[#FF0000]',
    hoverColor: 'hover:bg-[#cc0000]',
  },
  {
    key: 'social_linkedin_url',
    label: 'LinkedIn',
    icon: <Linkedin className="w-4 h-4 md:w-5 md:h-5" />,
    bgColor: 'bg-[#0A66C2]',
    hoverColor: 'hover:bg-[#085296]',
  },
  {
    key: 'social_x_url',
    label: 'X (Twitter)',
    icon: <Twitter className="w-4 h-4 md:w-5 md:h-5" />,
    bgColor: 'bg-black',
    hoverColor: 'hover:bg-gray-800',
  },
  {
    key: 'social_threads_url',
    label: 'Threads',
    icon: <AtSign className="w-4 h-4 md:w-5 md:h-5" />,
    bgColor: 'bg-black',
    hoverColor: 'hover:bg-gray-800',
  },
]

// Server-side fetch (cached)
async function getSocialUrls(): Promise<Record<string, string>> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    // @ts-expect-error
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .like('key', 'social_%')

    type Row = { key: string; value: string }
    const map: Record<string, string> = {}
    ;(data || []).forEach((row: Row) => {
      if (row.value && row.value.trim()) map[row.key] = row.value.trim()
    })
    return map
  } catch (e) {
    return {}
  }
}

// ============================================================================

interface SocialLinksProps {
  variant?: 'default' | 'compact' | 'large'
  className?: string
  showLabel?: boolean
}

export default async function SocialLinks({
  variant = 'default',
  className = '',
  showLabel = false,
}: SocialLinksProps) {
  const urls = await getSocialUrls()
  const activeLinks = SOCIAL_LINKS.filter(link => urls[link.key])

  if (activeLinks.length === 0) return null

  const sizeClasses = {
    compact: 'w-8 h-8',
    default: 'w-10 h-10 md:w-11 md:h-11',
    large: 'w-12 h-12 md:w-14 md:h-14',
  }

  const sizeClass = sizeClasses[variant]

  return (
    <div className={`flex items-center justify-center gap-2 md:gap-3 flex-wrap ${className}`}>
      {showLabel && (
        <p className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-gray-500 mb-2 w-full text-center">
          Follow us · تابعنا
        </p>
      )}
      {activeLinks.map(link => (
        <a
          key={link.key}
          href={urls[link.key]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          title={link.label}
          className={`${sizeClass} rounded-2xl ${link.bgColor} ${link.hoverColor} text-white flex items-center justify-center shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all duration-300 no-underline`}
        >
          {link.icon}
        </a>
      ))}
    </div>
  )
}
