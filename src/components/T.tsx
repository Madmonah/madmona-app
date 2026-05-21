'use client'
// src/components/T.tsx
// ============================================================
// Tiny translation primitive usable INSIDE server components.
//
// Server components can't call the useT() hook, but they can render
// this client component, which reads the language context and outputs
// the translated string. Lets us localise server-rendered pages
// (like the home page) without converting them to client components.
//
//   <T k="home.news.title" />
//   <T k="market.results" vars={{ n: 12 }} />
// ============================================================

import { useT } from '@/lib/i18n/LanguageProvider'

export default function T({
  k,
  vars,
}: {
  k: string
  vars?: Record<string, string | number>
}) {
  const { t } = useT()
  return <>{t(k, vars)}</>
}
