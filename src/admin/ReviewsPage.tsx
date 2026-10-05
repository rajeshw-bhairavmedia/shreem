import { Check, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Review } from '../../shared/store'
import { Stars } from '../components/ProductReviews'
import { supabase } from '../lib/supabase'
import { card, formatDate } from './shared'

type Row = Review & { products: { name: string; slug: string } | null; orders: { order_number: string } | null }
type Tab = Review['status']

const tabs: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Waiting for approval' },
  { id: 'approved', label: 'Published' },
  { id: 'rejected', label: 'Rejected' },
]

export default function ReviewsPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('status') as Tab) || 'pending'
  const [reviews, setReviews] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () =>
    supabase
      .from('reviews')
      .select('*, products(name, slug), orders(order_number)')
      .eq('status', tab)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => (error ? setError(error.message) : setReviews(data as Row[])))

  useEffect(() => {
    setReviews(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const setStatus = async (r: Row, status: Tab) => {
    const { error } = await supabase.from('reviews').update({ status }).eq('id', r.id)
    if (error) setError(error.message)
    else load()
  }

  const remove = async (r: Row) => {
    if (!confirm('Delete this review permanently?')) return
    const { error } = await supabase.from('reviews').delete().eq('id', r.id)
    if (error) setError(error.message)
    else load()
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-black tracking-tight">Reviews</h1>
      <p className="text-sm text-shreem-gray mt-1 mb-6">
        From verified buyers only. Reviews appear on the product page after you approve them.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setParams(t.id === 'pending' ? {} : { status: t.id })}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-shreem-black text-white' : 'bg-white text-shreem-black hover:bg-shreem-black/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {reviews === null ? (
        <p className="text-shreem-gray text-sm">Loading…</p>
      ) : reviews.length === 0 ? (
        <div className={`${card} p-8 text-center text-shreem-gray text-sm`}>No reviews here.</div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className={`${card} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Stars rating={r.rating} />
                    {r.products && (
                      <Link to={`/product/${r.products.slug}`} target="_blank" className="font-medium hover:text-shreem-gold">
                        {r.products.name}
                      </Link>
                    )}
                  </div>
                  {r.title && <p className="font-semibold mt-2">{r.title}</p>}
                  <p className="text-sm text-shreem-gray mt-1 whitespace-pre-line">{r.body}</p>
                  <p className="text-xs text-shreem-gray mt-2">
                    {r.name} · {formatDate(r.created_at)}
                    {r.orders && <> · order {r.orders.order_number}</>}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.status !== 'approved' && (
                    <button onClick={() => setStatus(r, 'approved')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200">
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button onClick={() => setStatus(r, 'rejected')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
                      <X className="w-3.5 h-3.5" /> {r.status === 'approved' ? 'Unpublish' : 'Reject'}
                    </button>
                  )}
                  <button onClick={() => remove(r)} className="p-1.5 text-shreem-gray hover:text-red-600" aria-label="Delete review">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
