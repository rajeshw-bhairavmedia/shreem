import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Order, OrderStatus } from '../../shared/store'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/utils'
import { StatusBadge, card, formatDate, statusLabels } from './shared'

const tabs: (OrderStatus | 'all')[] = ['paid', 'shipped', 'delivered', 'cancelled', 'pending_payment', 'all']

type OrderSummary = Pick<
  Order,
  'id' | 'order_number' | 'status' | 'customer_name' | 'customer_phone' | 'total' | 'created_at' | 'items' | 'address'
>

export default function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('status') as OrderStatus | 'all') || 'paid'
  const [orders, setOrders] = useState<OrderSummary[] | null>(null)
  const [counts, setCounts] = useState<Partial<Record<OrderStatus, number>>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setOrders(null)
    let query = supabase
      .from('orders')
      .select('id, order_number, status, customer_name, customer_phone, total, created_at, items, address')
      .order('created_at', { ascending: false })
      .limit(300)
    if (tab !== 'all') query = query.eq('status', tab)
    query.then(({ data, error }) => {
      if (error) setError(error.message)
      else setOrders(data as OrderSummary[])
    })
  }, [tab])

  useEffect(() => {
    Promise.all(
      (['paid', 'shipped'] as OrderStatus[]).map(async (s) => {
        const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', s)
        return [s, count ?? 0] as const
      }),
    ).then((entries) => setCounts(Object.fromEntries(entries)))
  }, [])

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-black tracking-tight">Orders</h1>
          <p className="text-sm text-shreem-gray mt-1">
            {counts.paid ?? 0} to ship · {counts.shipped ?? 0} in transit
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setParams(t === 'paid' ? {} : { status: t })}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t ? 'bg-shreem-black text-white' : 'bg-white text-shreem-black hover:bg-shreem-black/5'
            }`}
          >
            {t === 'all' ? 'All' : statusLabels[t]}
            {t === 'paid' && counts.paid ? ` (${counts.paid})` : ''}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className={`${card} overflow-hidden`}>
        {orders === null ? (
          <p className="p-8 text-center text-shreem-gray text-sm">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="p-8 text-center text-shreem-gray text-sm">No orders here yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-shreem-gray border-b border-shreem-black/10">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-shreem-black/5">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-shreem-cream/60">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/admin/orders/${o.id}`} className="hover:text-shreem-gold">
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-shreem-gray whitespace-nowrap">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3">
                      {o.customer_name}
                      <div className="text-xs text-shreem-gray">{o.address.city}</div>
                    </td>
                    <td className="px-4 py-3 text-shreem-gray">{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(o.total)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/orders/${o.id}`}>
                        <StatusBadge status={o.status} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
