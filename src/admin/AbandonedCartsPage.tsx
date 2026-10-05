import { useEffect, useState } from 'react'
import type { AbandonedCart } from '../../shared/store'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/utils'
import { card, formatDate } from './shared'

function cartStatus(c: AbandonedCart) {
  if (c.recovered_at) return { label: 'Recovered', tone: 'bg-green-100 text-green-800' }
  if (c.reminder_sent_at) return { label: 'Reminder sent', tone: 'bg-blue-100 text-blue-800' }
  return { label: 'Not purchased', tone: 'bg-amber-100 text-amber-800' }
}

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<AbandonedCart[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('abandoned_carts')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500)
      .then(({ data, error }) => (error ? setError(error.message) : setCarts(data as AbandonedCart[])))
  }, [])

  const reminded = carts?.filter((c) => c.reminder_sent_at) ?? []
  const recoveredAfterReminder = reminded.filter((c) => c.recovered_at)

  return (
    <div>
      <h1 className="text-2xl font-display font-black tracking-tight">Abandoned carts</h1>
      <p className="text-sm text-shreem-gray mt-1 mb-6">
        Shoppers who entered their email at checkout. Unpaid carts get one reminder email after a few hours, sent
        once a day.
      </p>

      {carts && (
        <div className="grid grid-cols-3 gap-4 mb-6 max-w-xl">
          <div className={`${card} p-4`}>
            <p className="text-xs uppercase tracking-wider text-shreem-gray">Carts</p>
            <p className="text-xl font-semibold mt-1">{carts.length}</p>
          </div>
          <div className={`${card} p-4`}>
            <p className="text-xs uppercase tracking-wider text-shreem-gray">Reminded</p>
            <p className="text-xl font-semibold mt-1">{reminded.length}</p>
          </div>
          <div className={`${card} p-4`}>
            <p className="text-xs uppercase tracking-wider text-shreem-gray">Won back</p>
            <p className="text-xl font-semibold mt-1">{recoveredAfterReminder.length}</p>
          </div>
        </div>
      )}

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className={`${card} overflow-x-auto`}>
        {carts === null ? (
          <p className="p-8 text-center text-shreem-gray text-sm">Loading…</p>
        ) : carts.length === 0 ? (
          <p className="p-8 text-center text-shreem-gray text-sm">No abandoned carts.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-shreem-gray border-b border-shreem-black/10">
              <tr>
                <th className="px-4 py-3 font-medium">Shopper</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium text-right">Value</th>
                <th className="px-4 py-3 font-medium">Last active</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-shreem-black/5">
              {carts.map((c) => {
                const status = cartStatus(c)
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      {c.name && <div className="font-medium">{c.name}</div>}
                      <a href={`mailto:${c.email}`} className="text-xs text-shreem-gray hover:text-shreem-gold">{c.email}</a>
                    </td>
                    <td className="px-4 py-3 text-shreem-gray">
                      {c.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ''} × ${i.quantity}`).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(c.subtotal)}</td>
                    <td className="px-4 py-3 text-shreem-gray whitespace-nowrap">{formatDate(c.updated_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${status.tone}`}>{status.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
