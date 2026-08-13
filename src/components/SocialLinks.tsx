import {
  Instagram, Facebook, Linkedin, Youtube, Twitter,
  Music2, AtSign, Twitch, MapPin, Send,
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
    key: 'social_telegram_url',
    label: 'Telegram',
    icon: <Send className="w-4 h-4 md:w-5 md:h-5" />,
    bgColor: 'bg-[#229ED9]',
    hoverColor: 'hover:bg-[#1c8ac2]',
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
  {
    key: 'social_pinterest_url',
    label: 'Pinterest',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-4 h-4 md:w-5 md:h-5">
        <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345c-.091.378-.293 1.194-.333 1.361-.052.22-.174.266-.402.16-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
      </svg>
    ),
    bgColor: 'bg-[#E60023]',
    hoverColor: 'hover:bg-[#ad081b]',
  },
  {
    key: 'social_vk_url',
    label: 'VK',
    icon: (
      <svg viewBox="60 150 330 220" fill="currentColor" aria-hidden="true" className="w-4 h-4 md:w-5 md:h-5">
        <path d="M75.6 168.3H126.7C128.4 253.8 166.1 290 196 297.4V168.3H244.2V242C273.7 238.8 304.6 205.2 315.1 168.3H363.3C359.3 187.4 351.5 205.6 340.2 221.6C328.9 237.6 314.5 251.1 297.7 261.2C316.4 270.5 332.9 283.6 346.1 299.8C359.4 315.9 369 334.6 374.5 354.7H321.4C316.6 337.3 306.6 321.6 292.9 309.8C279.1 297.9 262.2 290.4 244.2 288.1V354.7H238.4C136.3 354.7 78 284.7 75.6 168.3z" />
      </svg>
    ),
    bgColor: 'bg-[#0077FF]',
    hoverColor: 'hover:bg-[#0066dd]',
  },
  {
    key: 'social_bluesky_url',
    label: 'Bluesky',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="w-4 h-4 md:w-5 md:h-5">
        <path d="M3.468 1.948C5.303 3.325 7.276 6.118 8 7.616c.725-1.498 2.698-4.29 4.532-5.668C13.855.955 16 .186 16 2.632c0 .489-.28 4.105-.444 4.692-.572 2.04-2.653 2.561-4.504 2.246 3.236.551 4.06 2.375 2.281 4.2-3.376 3.464-4.852-.87-5.23-1.98-.07-.204-.103-.3-.103-.218 0-.081-.033.014-.102.218-.379 1.11-1.855 5.444-5.231 1.98-1.778-1.825-.955-3.65 2.28-4.2-1.85.315-3.932-.205-4.503-2.246C.28 6.737 0 3.12 0 2.632 0 .186 2.145.955 3.468 1.948" />
      </svg>
    ),
    bgColor: 'bg-[#0085FF]',
    hoverColor: 'hover:bg-[#0066cc]',
  },
  {
    key: 'social_twitch_url',
    label: 'Twitch',
    icon: <Twitch className="w-4 h-4 md:w-5 md:h-5" />,
    bgColor: 'bg-[#9146FF]',
    hoverColor: 'hover:bg-[#7a2ff0]',
  },
  {
    key: 'social_googlebusiness_url',
    label: 'Google',
    icon: <MapPin className="w-4 h-4 md:w-5 md:h-5" />,
    bgColor: 'bg-[#4285F4]',
    hoverColor: 'hover:bg-[#3367d6]',
  },
]

// Server-side fetch (cached)
async function getSocialUrls(): Promise<Record<string, string>> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
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
