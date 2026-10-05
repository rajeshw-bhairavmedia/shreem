import { Download, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Order, OrderStatus } from '../../shared/store'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/utils'
import { StatusBadge, card, formatDate, input, statusLabels } from './shared'

const tabs: (OrderStatus | 'all')[] = ['paid', 'shipped', 'delivered', 'cancelled', 'pending_payment', 'all']

type OrderSummary = Order

const csvCell = (v: unknown) => {
  const text = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Downloads the orders as a CSV file (opens in Excel / Google Sheets). */
function exportCsv(orders: Order[]) {
  const header = [
    'Order', 'Invoice', 'Date', 'Status', 'Customer', 'Email', 'Phone', 'Address', 'City', 'State', 'PIN',
    'Items', 'Subtotal', 'Discount', 'Coupon', 'Shipping', 'Total', 'Refunded', 'Razorpay payment', 'Tracking',
  ]
  const rows = orders.map((o) => [
    o.order_number, o.invoice_number, new Date(o.created_at).toLocaleString('en-IN'), o.status, o.customer_name,
    o.customer_email, o.customer_phone, [o.address.line1, o.address.line2].filter(Boolean).join(', '), o.address.city,
    o.address.state, o.address.pincode,
    o.items.map((i) => `${i.name} (${[i.size, i.color].filter(Boolean).join('/')}) x${i.quantity}`).join('; '),
    o.subtotal, o.discount, o.coupon_code, o.shipping, o.total, o.refunded_amount, o.razorpay_payment_id, o.tracking,
  ])
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
  // The BOM (﻿) makes Excel read ₹ and non-English names correctly.
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `shreem-orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('status') as OrderStatus | 'all') || 'paid'
  const q = params.get('q') ?? ''
  const [search, setSearch] = useState(q)
  const [orders, setOrders] = useState<OrderSummary[] | null>(null)
  const [counts, setCounts] = useState<Partial<Record<OrderStatus, number>>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setOrders(null)
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (tab !== 'all') query = query.eq('status', tab)
    // Characters that would break the filter syntax are dropped from the search.
    const term = q.replace(/[,()%*\\]/g, ' ').trim()
    if (term) {
      query = query.or(
        ['order_number', 'invoice_number', 'customer_name', 'customer_email', 'customer_phone']
          .map((col) => `${col}.ilike.%${term}%`)
          .join(','),
      )
    }
    query.then(({ data, error }) => {
      if (error) setError(error.message)
      else setOrders(data as OrderSummary[])
    })
  }, [tab, q])

  const setParam = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (!v || (k === 'status' && v === 'paid')) next.delete(k)
      else next.set(k, v)
    }
    setParams(next)
  }

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
            onClick={() => setParam({ status: t })}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t ? 'bg-shreem-black text-white' : 'bg-white text-shreem-black hover:bg-shreem-black/5'
            }`}
          >
            {t === 'all' ? 'All' : statusLabels[t]}
            {t === 'paid' && counts.paid ? ` (${counts.paid})` : ''}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setParam({ q: search.trim() })
          }}
          className="relative flex-1 min-w-[220px] max-w-sm"
        >
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-shreem-gray" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, name, email, phone"
            aria-label="Search orders"
            className={`${input} pl-9`}
          />
        </form>
        {q && (
          <button onClick={() => { setSearch(''); setParam({ q: '' }) }} className="text-sm text-shreem-gray hover:text-shreem-black">
            Clear search
          </button>
        )}
        <button
          onClick={() => orders && exportCsv(orders)}
          disabled={!orders?.length}
          className="ml-auto inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-white text-sm font-medium hover:bg-shreem-black/5 disabled:opacity-40"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
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
