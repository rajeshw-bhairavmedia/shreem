import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type ProductRow } from '../lib/supabase'
import { formatPrice } from '../lib/utils'
import { card } from './shared'

const categoryNames = { men: 'Men', women: 'Women', occasion: 'Occasion Wear' }

function stockSummary(p: ProductRow) {
  const counts = p.sizes.map((s) => p.stock[s]).filter((n): n is number => typeof n === 'number')
  if (!counts.length) return { label: 'Not tracked', tone: 'text-shreem-gray' }
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0) return { label: 'Sold out', tone: 'text-red-600' }
  if (counts.some((n) => n <= 3)) return { label: `${total} in stock · some sizes low`, tone: 'text-amber-700' }
  return { label: `${total} in stock`, tone: 'text-shreem-gray' }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () =>
    supabase
      .from('products')
      .select('*')
      .order('sort_order')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => (error ? setError(error.message) : setProducts(data as ProductRow[])))

  useEffect(() => {
    load()
  }, [])

  type Flag = 'is_active' | 'is_new' | 'is_bestseller' | 'is_trending'

  // Flip a yes/no setting straight from the list (updates instantly, reverts if saving fails).
  const toggle = async (p: ProductRow, flag: Flag) => {
    const value = !p[flag]
    setProducts((list) => list?.map((x) => (x.id === p.id ? { ...x, [flag]: value } : x)) ?? null)
    const { error } = await supabase.from('products').update({ [flag]: value }).eq('id', p.id)
    if (error) {
      setError(error.message)
      load()
    }
  }

  const chips: { flag: Flag; label: string; on: string }[] = [
    { flag: 'is_trending', label: 'Trending', on: 'bg-shreem-gold text-shreem-black' },
    { flag: 'is_bestseller', label: 'Bestseller', on: 'bg-shreem-gold/30 text-shreem-black' },
    { flag: 'is_new', label: 'New', on: 'bg-shreem-black text-white' },
  ]

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-black tracking-tight">Products</h1>
          <p className="text-sm text-shreem-gray mt-1">{products ? `${products.length} products` : ' '}</p>
        </div>
        <Link to="/admin/products/new" className="btn-primary !px-5 !py-2.5 gap-1">
          <Plus className="w-4 h-4" /> Add product
        </Link>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className={`${card} divide-y divide-shreem-black/5`}>
        {products === null ? (
          <p className="p-8 text-center text-shreem-gray text-sm">Loading…</p>
        ) : products.length === 0 ? (
          <p className="p-8 text-center text-shreem-gray text-sm">No products yet. Add your first one.</p>
        ) : (
          products.map((p) => {
            const stock = stockSummary(p)
            return (
              <div key={p.id} className={`flex items-center gap-4 p-4 ${p.is_active ? '' : 'opacity-60'}`}>
                <Link to={`/admin/products/${p.id}`} className="w-14 h-16 flex-shrink-0 rounded overflow-hidden bg-shreem-cream">
                  {p.images[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/admin/products/${p.id}`} className="font-medium hover:text-shreem-gold">
                    {p.name}
                  </Link>
                  <p className="text-xs text-shreem-gray capitalize">
                    {categoryNames[p.category]}
                    {p.style ? ` · ${p.style}` : ''}
                  </p>
                  <p className={`text-xs mt-0.5 ${stock.tone}`}>{stock.label}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {chips.map((c) => (
                      <button
                        key={c.flag}
                        onClick={() => toggle(p, c.flag)}
                        aria-pressed={p[c.flag]}
                        title={`${p[c.flag] ? 'Remove from' : 'Add to'} ${c.label}`}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                          p[c.flag] ? `${c.on} border-transparent` : 'border-shreem-black/15 text-shreem-gray hover:border-shreem-black/40'
                        }`}
                      >
                        {p[c.flag] ? '✓ ' : '+ '}
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">{formatPrice(p.price)}</div>
                  {p.original_price && p.original_price > p.price && (
                    <div className="text-xs text-shreem-gray line-through">{formatPrice(p.original_price)}</div>
                  )}
                </div>
                <button
                  onClick={() => toggle(p, 'is_active')}
                  className={`hidden sm:block px-3 py-1 rounded-full text-xs font-medium ${
                    p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}
                  title={p.is_active ? 'Visible in store. Click to hide.' : 'Hidden from store. Click to show.'}
                >
                  {p.is_active ? 'Visible' : 'Hidden'}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
