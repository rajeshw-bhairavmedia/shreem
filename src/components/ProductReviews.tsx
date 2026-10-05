import { Star } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { Review } from '../../shared/store'
import { supabase, supabaseEnabled } from '../lib/supabase'

type PublicReview = Pick<Review, 'id' | 'name' | 'rating' | 'title' | 'body' | 'created_at'>

/** Approved reviews for a product (by its URL slug). */
export function useReviews(slug: string) {
  const [reviews, setReviews] = useState<PublicReview[]>([])
  useEffect(() => {
    if (!supabaseEnabled) return
    supabase
      .from('reviews')
      .select('id, name, rating, title, body, created_at, products!inner(slug)')
      .eq('products.slug', slug)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => setReviews((data as unknown as PublicReview[]) ?? []))
  }, [slug])
  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  return { reviews, average }
}

export function Stars({ rating, size = 'w-4 h-4' }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${n <= Math.round(rating) ? 'fill-shreem-gold text-shreem-gold' : 'text-shreem-black/20'}`}
        />
      ))}
    </span>
  )
}

const inputClass =
  'w-full h-11 px-3 rounded-lg border border-shreem-black/10 bg-white text-sm focus:outline-none focus:border-shreem-gold'

export default function ProductReviews({ slug, reviews, average }: { slug: string } & ReturnType<typeof useReviews>) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ rating: 0, name: '', title: '', body: '', orderNumber: '', email: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  if (!supabaseEnabled) return null

  const set = (key: keyof typeof form, value: string | number) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.rating) return setError('Please choose a star rating.')
    setError(null)
    setStatus('sending')
    const res = await fetch('/api/submit-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, slug }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setStatus('idle')
      return setError(data.error ?? 'Could not send your review. Please try again.')
    }
    setStatus('sent')
  }

  return (
    <section id="reviews" className="mt-20 px-4 sm:px-6 lg:px-10 scroll-mt-28">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-display font-bold">Customer Reviews</h2>
          {reviews.length > 0 ? (
            <div className="flex items-center gap-2 mt-2">
              <Stars rating={average} />
              <span className="text-sm text-shreem-gray">
                {average.toFixed(1)} out of 5 · {reviews.length} review{reviews.length === 1 ? '' : 's'}
              </span>
            </div>
          ) : (
            <p className="text-sm text-shreem-gray mt-2">No reviews yet. Bought this piece? Be the first to review it.</p>
          )}
        </div>
        {!open && status !== 'sent' && (
          <button onClick={() => setOpen(true)} className="btn-outline">
            Write a review
          </button>
        )}
      </div>

      {status === 'sent' ? (
        <p className="bg-white rounded-xl p-6 mb-8 text-sm">
          Thank you! Your review has been received and will appear here once it's approved.
        </p>
      ) : (
        open && (
          <form onSubmit={submit} className="bg-white rounded-xl p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
            <div className="sm:col-span-2">
              <span className="text-sm font-medium">Your rating</span>
              <div className="flex gap-1 mt-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={form.rating === n}
                    aria-label={`${n} star${n === 1 ? '' : 's'}`}
                    onClick={() => set('rating', n)}
                    className="p-1"
                  >
                    <Star className={`w-7 h-7 ${n <= form.rating ? 'fill-shreem-gold text-shreem-gold' : 'text-shreem-black/20'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="rv-name" className="text-sm font-medium">Name (shown with your review)</label>
              <input id="rv-name" required minLength={2} maxLength={60} value={form.name} onChange={(e) => set('name', e.target.value)} className={`${inputClass} mt-1`} />
            </div>
            <div>
              <label htmlFor="rv-title" className="text-sm font-medium">Title (optional)</label>
              <input id="rv-title" maxLength={100} value={form.title} onChange={(e) => set('title', e.target.value)} className={`${inputClass} mt-1`} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="rv-body" className="text-sm font-medium">Your review</label>
              <textarea id="rv-body" required minLength={10} maxLength={2000} rows={4} value={form.body} onChange={(e) => set('body', e.target.value)} className={`${inputClass} h-auto py-2 mt-1 resize-none`} />
            </div>
            <div>
              <label htmlFor="rv-order" className="text-sm font-medium">Order number</label>
              <input id="rv-order" required placeholder="e.g. SL1001" value={form.orderNumber} onChange={(e) => set('orderNumber', e.target.value.toUpperCase())} className={`${inputClass} mt-1`} />
            </div>
            <div>
              <label htmlFor="rv-email" className="text-sm font-medium">Email used for the order</label>
              <input id="rv-email" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} className={`${inputClass} mt-1`} />
            </div>
            <p className="sm:col-span-2 text-xs text-shreem-gray">
              Only customers who bought this piece can review it. Your email is never shown.
            </p>
            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={status === 'sending'} className="btn-primary disabled:opacity-60">
                {status === 'sending' ? 'Sending…' : 'Submit review'}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-shreem-gray hover:text-shreem-black px-4">
                Cancel
              </button>
            </div>
          </form>
        )
      )}

      {reviews.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <li key={r.id} className="bg-white rounded-xl p-6">
              <div className="flex items-center justify-between gap-2 mb-2">
                <Stars rating={r.rating} />
                <span className="text-xs text-shreem-gray">
                  {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {r.title && <h3 className="font-semibold mb-1">{r.title}</h3>}
              <p className="text-sm text-shreem-gray leading-relaxed whitespace-pre-line">{r.body}</p>
              <p className="text-xs font-medium mt-3">
                {r.name} <span className="text-green-700 font-normal">· Verified buyer</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
