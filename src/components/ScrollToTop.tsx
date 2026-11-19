import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Starts each page at the top, or at the #section in the URL.
 * Also runs when only the ?query changes (e.g. footer links to
 * /collections?category=women), unless the navigation passes
 * `state: { keepScroll: true }` (used by in-page filter controls).
 */
export default function ScrollToTop() {
  const { pathname, search, hash, state } = useLocation()
  const keepScroll = (state as { keepScroll?: boolean } | null)?.keepScroll

  useEffect(() => {
    if (keepScroll) return
    if (hash) {
      const t = setTimeout(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
      return () => clearTimeout(t)
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search, hash])

  return null
}
