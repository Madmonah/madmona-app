'use client'

import { useEffect } from 'react'

// Registers the Madmona service worker on first page load. Runs only in
// the browser (the file is a client component) and only when serviceWorker
// is supported. Errors are logged but don't break the app — PWA install
// still works as long as the manifest + HTTPS + icons are present.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // Register after window load to not compete with critical rendering
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => console.warn('[sw] registration failed', err))
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }
  }, [])

  return null
}
