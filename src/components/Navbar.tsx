import { Menu, Search, ShoppingBag, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { site } from '../config/site'
import { useCart } from '../context/CartContext'
import CountrySelector from './CountrySelector'
import { styles } from '../data/categories'

const navLinks = [
  { label: 'Men', href: '/collections?category=men', sub: true },
  { label: 'Women', href: '/collections?category=women', sub: true },
  { label: 'Occasion Wear', href: '/collections?category=occasion' },
  { label: 'New Arrivals', href: '/collections?filter=new' },
  { label: 'Lookbook', href: '/lookbook' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function Navbar({ onSearch }: { onSearch: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { count, openCart } = useCart()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setMenuOpen(false), [location])

  const isActive = (href: string) => {
    if (href.startsWith('/#')) return false
    if (!href.includes('?')) return location.pathname === href
    return (location.pathname + location.search + '&').startsWith(href + '&')
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,box-shadow] duration-500 ${
          scrolled || menuOpen ? 'bg-shreem-cream/95 shadow-nav' : 'bg-transparent'
        }`}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-4 lg:py-5">
          <Link to="/" className="relative z-10">
            <span className="text-xl sm:text-2xl font-display font-black tracking-tight text-shreem-black">
              SHREEM
            </span>
          </Link>

          <nav className="nav-desktop hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <div key={link.label} className="nav-item">
                <Link to={link.href} className={`nav-link ${isActive(link.href) ? 'active' : ''}`}>
                  {link.label}
                </Link>
                {link.sub && (
                  <div className="nav-dropdown">
                    <div className="nav-dropdown-panel">
                      {styles.map((s) => (
                        <Link key={s.id} to={`${link.href}&sub=${s.id}`} className="nav-dropdown-link">
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <CountrySelector />
            <button
              onClick={onSearch}
              className="p-2 hover:bg-shreem-black/5 rounded-full transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-shreem-black" />
            </button>
            <button
              onClick={openCart}
              className="relative p-2 hover:bg-shreem-black/5 rounded-full transition-colors"
              aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
            >
              <ShoppingBag className="w-5 h-5 text-shreem-black" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-shreem-gold text-shreem-black text-[10px] font-semibold flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 hover:bg-shreem-black/5 rounded-full transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-6 h-6 text-shreem-black" /> : <Menu className="w-6 h-6 text-shreem-black" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-500 ${
          menuOpen ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'
        }`}
      >
        <div className="absolute inset-0 bg-shreem-black/20 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
        <div
          className={`absolute top-0 right-0 w-full max-w-sm h-full bg-shreem-cream shadow-2xl transition-transform duration-500 ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full pt-24 pb-8 px-8 overflow-y-auto">
            <nav className="flex flex-col gap-6">
              {navLinks.map((link) => (
                <div key={link.label}>
                  <Link
                    to={link.href}
                    className="text-2xl font-display font-semibold text-shreem-black hover:text-shreem-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                  {link.sub && (
                    <div className="mobile-sub">
                      {styles.map((s) => (
                        <Link key={s.id} to={`${link.href}&sub=${s.id}`} className="mobile-sub-link">
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
            <div className="mt-auto pt-8">
              <p className="text-sm text-shreem-gray mb-4">Follow us on social media</p>
              <div className="flex gap-4">
                {[
                  { label: 'IG', href: site.social.instagram },
                  { label: 'FB', href: site.social.facebook },
                  { label: 'WA', href: `https://wa.me/${site.whatsappNumber}` },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-shreem-black/5 flex items-center justify-center hover:bg-shreem-gold/20 transition-colors"
                  >
                    <span className="text-sm font-medium">{s.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
