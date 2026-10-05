import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { formatPrice, matchesQuery } from '../lib/utils'

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { products } = useCatalog()
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const q = query.trim()
  const results = q ? products.filter((p) => matchesQuery(p, q)).slice(0, 5) : []

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!q) return
    navigate(`/collections?q=${encodeURIComponent(q)}`)
    onClose()
  }

  return (
    <div
      className={`fixed inset-0 z-[60] transition-all duration-300 ${
        open ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'
      }`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-shreem-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-shreem-cream shadow-nav px-4 sm:px-6 lg:px-10 py-6 transition-transform duration-300 ${
          open ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <form onSubmit={submit} className="flex items-center gap-3 max-w-3xl mx-auto">
          <Search className="w-5 h-5 text-shreem-gray flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search kurtas, anarkalis, colours…"
            className="flex-1 bg-transparent text-lg py-2 border-b border-shreem-black/20 focus:outline-none focus:border-shreem-gold"
          />
          <button type="button" onClick={onClose} className="p-2 hover:bg-shreem-black/5 rounded-full" aria-label="Close search">
            <X className="w-5 h-5" />
          </button>
        </form>

        {q && (
          <div className="max-w-3xl mx-auto mt-4">
            {results.length ? (
              <ul className="divide-y divide-shreem-black/10">
                {results.map((p) => (
                  <li key={p.id}>
                    <Link to={`/product/${p.id}`} onClick={onClose} className="flex items-center gap-4 py-3 group">
                      <img src={p.images[0]} alt="" className="w-12 h-14 object-cover rounded" />
                      <span className="flex-1 font-medium group-hover:text-shreem-gold transition-colors">{p.name}</span>
                      <span className="text-sm text-shreem-gray">{formatPrice(p.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-shreem-gray py-3">No products match “{q}”.</p>
            )}
            {results.length > 0 && (
              <button onClick={submit} className="mt-3 text-sm font-medium hover:text-shreem-gold transition-colors">
                See all results →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
