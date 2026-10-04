import gsap from 'gsap'
import { ChevronDown, Funnel, Grid3x3, LayoutList, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useCatalog } from '../context/CatalogContext'
import { categories, hasStyles, styles } from '../data/categories'
import { matchesQuery } from '../lib/utils'

const categoryOptions = [{ id: 'all', label: 'All' }, ...categories]
const styleOptions = [{ id: 'all', label: 'All' }, ...styles]
const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New Arrivals' },
  { id: 'bestseller', label: 'Bestsellers' },
  { id: 'sale', label: 'On Sale' },
]
const sortOptions = [
  { id: 'featured', label: 'Featured' },
  { id: 'newest', label: 'Newest' },
  { id: 'price-low', label: 'Price: Low to High' },
  { id: 'price-high', label: 'Price: High to Low' },
]

const pill = (active: boolean, activeClass: string, idleClass: string) =>
  `rounded-full font-medium transition-all duration-300 ${active ? activeClass : idleClass}`

export default function CollectionsPage() {
  const [params, setParams] = useSearchParams()
  const [sort, setSort] = useState('featured')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const { products, loading } = useCatalog()

  // The URL is the source of truth, so filtered views can be linked and shared.
  const category = params.get('category') || 'all'
  const style = params.get('sub') || 'all'
  const filter = params.get('filter') || 'all'
  const query = params.get('q')?.trim() || ''

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === 'all' || !value) next.delete(key)
      else next.set(key, value)
    }
    setParams(next)
  }
  const setCategory = (id: string) => update({ category: id, sub: 'all' })
  const setStyle = (id: string) => update({ sub: id })
  const setFilter = (id: string) => update({ filter: id })

  useEffect(() => {
    if (gridRef.current?.children.length) {
      gsap.fromTo(gridRef.current.children, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out' })
    }
  }, [category, style, filter, sort, query, loading])

  const shown = products
    .filter(
      (p) =>
        (category === 'all' || p.category === category) &&
        (style === 'all' || p.subcategory === style) &&
        (filter !== 'new' || p.isNew) &&
        (filter !== 'bestseller' || p.isBestseller) &&
        (filter !== 'sale' || p.isSale) &&
        (!query || matchesQuery(p, query)),
    )
    .sort((a, b) => {
      switch (sort) {
        case 'price-low':
          return a.price - b.price
        case 'price-high':
          return b.price - a.price
        case 'newest':
          return Number(!!b.isNew) - Number(!!a.isNew)
        default:
          return 0
      }
    })

  const styleRow = (size: 'sm' | 'md') =>
    styleOptions.map((s) => (
      <button
        key={s.id}
        onClick={() => setStyle(s.id)}
        className={`${size === 'sm' ? 'px-4 py-1.5 text-xs' : 'px-4 py-2 text-sm'} ${pill(
          style === s.id,
          'bg-shreem-gold text-shreem-black',
          'bg-shreem-black/5 text-shreem-black hover:bg-shreem-black/10',
        )}`}
      >
        {s.label}
      </button>
    ))

  return (
    <div className="pt-24 lg:pt-32 pb-20">
      <div className="px-4 sm:px-6 lg:px-10 mb-8">
        <h1 className="section-heading mb-4">{query ? 'Search' : 'Collections'}</h1>
        <p className="section-subheading max-w-xl">
          {query
            ? `Results for “${query}”`
            : 'Discover our curated selection of premium ethnic wear, crafted with traditional techniques and contemporary designs.'}
        </p>
        {query && (
          <button onClick={() => update({ q: '' })} className="mt-4 inline-flex items-center gap-1 text-sm text-shreem-gray hover:text-shreem-black">
            <X className="w-4 h-4" /> Clear search
          </button>
        )}
      </div>

      <div className="px-4 sm:px-6 lg:px-10 mb-8">
        <div className="flex flex-wrap gap-3">
          {categoryOptions.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-6 py-2.5 text-sm ${pill(
                category === c.id,
                'bg-shreem-black text-white',
                'bg-white text-shreem-black hover:bg-shreem-black/5',
              )}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {hasStyles(category) && (
        <div className="px-4 sm:px-6 lg:px-10 -mt-4 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-shreem-gray mr-2">Style:</span>
            {styleRow('sm')}
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-10 mb-8">
        <div className="flex items-center justify-between py-4 border-y border-shreem-black/10">
          <div className="flex items-center gap-4">
            <button onClick={() => setFiltersOpen(true)} className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-medium">
              <Funnel className="w-4 h-4" />
              Filter
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-sm text-shreem-gray mr-2">Filter:</span>
              {filterOptions.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-4 py-1.5 text-xs ${pill(
                    filter === f.id,
                    'bg-shreem-gold text-shreem-black',
                    'bg-shreem-black/5 text-shreem-black hover:bg-shreem-black/10',
                  )}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1 bg-shreem-black/5 rounded-lg p-1">
              <button
                onClick={() => setView('grid')}
                className={`p-2 rounded-md transition-colors ${view === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
                aria-label="Grid view"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
                aria-label="List view"
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none px-4 py-2 pr-10 bg-white rounded-lg text-sm font-medium focus:outline-none cursor-pointer"
                aria-label="Sort products"
              >
                {sortOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 mb-6">
        <p className="text-sm text-shreem-gray">
          {loading ? 'Loading products…' : `Showing ${shown.length} product${shown.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div
        ref={gridRef}
        className={`px-4 sm:px-6 lg:px-10 ${
          view === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6' : 'flex flex-col gap-6'
        }`}
      >
        {shown.map((p) => (
          <ProductCard key={p.id} product={p} badges={['new', 'bestseller', 'sale']} detailed list={view === 'list'} />
        ))}
      </div>

      {!loading && shown.length === 0 && (
        <div className="px-4 sm:px-6 lg:px-10 py-20 text-center">
          <p className="text-lg text-shreem-gray mb-4">No products found matching your filters.</p>
          <button onClick={() => setParams({})} className="btn-outline">
            Clear Filters
          </button>
        </div>
      )}

      {/* Mobile filter sheet */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          filtersOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-shreem-black/20 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
        <div
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl transition-transform duration-300 ${
            filtersOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Filters</h3>
              <button onClick={() => setFiltersOpen(false)} className="p-2 hover:bg-shreem-black/5 rounded-full" aria-label="Close filters">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Category</h4>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`px-4 py-2 text-sm ${pill(category === c.id, 'bg-shreem-black text-white', 'bg-shreem-black/5 text-shreem-black')}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              {hasStyles(category) && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Style</h4>
                  <div className="flex flex-wrap gap-2">{styleRow('md')}</div>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium mb-3">Filter By</h4>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`px-4 py-2 text-sm ${pill(filter === f.id, 'bg-shreem-gold text-shreem-black', 'bg-shreem-black/5 text-shreem-black')}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setFiltersOpen(false)} className="w-full btn-primary mt-8">
              Show {shown.length} Product{shown.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
