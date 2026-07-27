// src/app/auth/magic/layout.tsx
// Isolated layout for the magic link page — no PWA install prompts or heavy chrome.
// Ensures the page renders even if the main layout has heavy client work.

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function MagicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
