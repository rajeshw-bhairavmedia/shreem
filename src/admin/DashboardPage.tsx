import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Order } from '../../shared/store'
import { supabase, type ProductRow } from '../lib/supabase'
import { formatPrice } from '../lib/utils'
import { StatusBadge, card, formatDate } from './shared'

const DAYS = 30
// Deeper step of the brand gold: passes 3:1 contrast on the white card (validated).
const BAR = '#B8862F'
const BAR_HOVER = '#9C7026'

type PaidOrder = Pick<Order, 'id' | 'order_number' | 'status' | 'customer_name' | 'total' | 'items' | 'paid_at' | 'created_at'>

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

export default function DashboardPage() {
  const [orders, setOrders] = useState<PaidOrder[] | null>(null)
  const [toShip, setToShip] = useState(0)
  const [lowStock, setLowStock] = useState<{ id: string; name: string; sizes: string }[]>([])
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const since = new Date()
    since.setDate(since.getDate() - (DAYS - 1))
    since.setHours(0, 0, 0, 0)

    supabase
      .from('orders')
      .select('id, order_number, status, customer_name, total, items, paid_at, created_at')
      .in('status', ['paid', 'shipped', 'delivered'])
      .gte('paid_at', since.toISOString())
      .order('paid_at', { ascending: false })
      .then(({ data }) => setOrders((data as PaidOrder[]) ?? []))

    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'paid')
      .then(({ count }) => setToShip(count ?? 0))

    supabase
      .from('products')
      .select('id, name, sizes, stock, is_active')
      .eq('is_active', true)
      .then(({ data }) => {
        const rows = (data as Pick<ProductRow, 'id' | 'name' | 'sizes' | 'stock'>[]) ?? []
        setLowStock(
          rows
            .map((p) => {
              const low = p.sizes.filter((s) => typeof p.stock[s] === 'number' && p.stock[s] <= 3)
              return { id: p.id, name: p.name, sizes: low.map((s) => `${s}: ${p.stock[s]}`).join(' · ') }
            })
            .filter((p) => p.sizes),
        )
      })
  }, [])

  const stats = useMemo(() => {
    if (!orders) return null
    const days = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (DAYS - 1 - i))
      return { date: d, revenue: 0, orders: 0 }
    })
    const index = new Map(days.map((d, i) => [dayKey(d.date), i]))
    const units = new Map<string, { name: string; units: number; revenue: number }>()
    for (const o of orders) {
      const i = index.get(dayKey(new Date(o.paid_at ?? o.created_at)))
      if (i !== undefined) {
        days[i].revenue += o.total
        days[i].orders += 1
      }
      for (const item of o.items) {
        const u = units.get(item.slug) ?? { name: item.name, units: 0, revenue: 0 }
        u.units += item.quantity
        u.revenue += item.price * item.quantity
        units.set(item.slug, u)
      }
    }
    const revenue = days.reduce((s, d) => s + d.revenue, 0)
    return {
      days,
      max: Math.max(...days.map((d) => d.revenue), 1),
      revenue,
      count: orders.length,
      today: days[DAYS - 1].revenue,
      week: days.slice(-7).reduce((s, d) => s + d.revenue, 0),
      aov: orders.length ? Math.round(revenue / orders.length) : 0,
      top: [...units.values()].sort((a, b) => b.units - a.units).slice(0, 5),
    }
  }, [orders])

  const shortDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  return (
    <div>
      <h1 className="text-2xl font-display font-black tracking-tight mb-6">Dashboard</h1>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`${card} p-5`}>
          <p className="text-xs uppercase tracking-wider text-shreem-gray">Sales · 30 days</p>
          <p className="text-2xl font-semibold mt-2">{stats ? formatPrice(stats.revenue) : '…'}</p>
          {stats && (
            <p className="text-xs text-shreem-gray mt-1">
              Today {formatPrice(stats.today)} · 7 days {formatPrice(stats.week)}
            </p>
          )}
        </div>
        <div className={`${card} p-5`}>
          <p className="text-xs uppercase tracking-wider text-shreem-gray">Orders · 30 days</p>
          <p className="text-2xl font-semibold mt-2">{stats?.count ?? '…'}</p>
        </div>
        <div className={`${card} p-5`}>
          <p className="text-xs uppercase tracking-wider text-shreem-gray">Average order</p>
          <p className="text-2xl font-semibold mt-2">{stats ? formatPrice(stats.aov) : '…'}</p>
        </div>
        <Link to="/admin/orders" className={`${card} p-5 hover:ring-2 hover:ring-shreem-gold/40 transition-shadow`}>
          <p className="text-xs uppercase tracking-wider text-shreem-gray">To ship</p>
          <p className="text-2xl font-semibold mt-2">{toShip}</p>
          <p className="text-xs text-shreem-gray mt-1 inline-flex items-center">
            Open orders <ArrowRight className="w-3 h-3 ml-1" />
          </p>
        </Link>
      </div>

      {/* Daily sales */}
      <section className={`${card} p-5 mb-6`}>
        <h2 className="font-semibold">Daily sales</h2>
        <p className="text-xs text-shreem-gray mb-4">Paid orders, last {DAYS} days</p>
        {stats ? (
          <div className="relative">
            <div className="flex justify-between text-[11px] text-shreem-gray mb-1">
              <span>{formatPrice(stats.max)}</span>
            </div>
            <div className="relative h-40 border-b border-shreem-black/15">
              <div className="absolute inset-x-0 top-0 border-t border-dashed border-shreem-black/10" aria-hidden />
              <div className="absolute inset-0 flex items-end gap-[2px]">
                {stats.days.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="relative flex-1 h-full flex items-end focus:outline-none"
                    aria-label={`${shortDate(d.date)}: ${formatPrice(d.revenue)} from ${d.orders} order${d.orders === 1 ? '' : 's'}`}
                  >
                    {d.revenue > 0 && (
                      <span
                        className="block w-full rounded-t-[4px] transition-colors"
                        style={{ height: `${(d.revenue / stats.max) * 100}%`, background: hover === i ? BAR_HOVER : BAR }}
                      />
                    )}
                  </button>
                ))}
              </div>
              {hover !== null && (
                <div
                  className="absolute -top-2 -translate-y-full -translate-x-1/2 bg-shreem-black text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap pointer-events-none z-10"
                  style={{ left: `${((hover + 0.5) / DAYS) * 100}%` }}
                >
                  <div className="font-medium">{shortDate(stats.days[hover].date)}</div>
                  <div>
                    {formatPrice(stats.days[hover].revenue)} · {stats.days[hover].orders} order
                    {stats.days[hover].orders === 1 ? '' : 's'}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between text-[11px] text-shreem-gray mt-1">
              <span>{shortDate(stats.days[0].date)}</span>
              <span>{shortDate(stats.days[Math.floor(DAYS / 2)].date)}</span>
              <span>Today</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-shreem-gray">Loading…</p>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className={`${card} p-5`}>
          <h2 className="font-semibold mb-3">Top sellers · 30 days</h2>
          {stats && stats.top.length ? (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-shreem-black/5">
                {stats.top.map((t) => (
                  <tr key={t.name}>
                    <td className="py-2">{t.name}</td>
                    <td className="py-2 text-right text-shreem-gray whitespace-nowrap">{t.units} sold</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-shreem-gray">No sales yet.</p>
          )}
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Low stock
          </h2>
          {lowStock.length ? (
            <ul className="divide-y divide-shreem-black/5 text-sm">
              {lowStock.map((p) => (
                <li key={p.id} className="py-2">
                  <Link to={`/admin/products/${p.id}`} className="font-medium hover:text-shreem-gold">{p.name}</Link>
                  <div className="text-xs text-shreem-gray">{p.sizes}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-shreem-gray">All sizes have more than 3 in stock.</p>
          )}
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-semibold mb-3">Recent orders</h2>
          {orders && orders.length ? (
            <ul className="divide-y divide-shreem-black/5 text-sm">
              {orders.slice(0, 5).map((o) => (
                <li key={o.id} className="py-2 flex items-center gap-2">
                  <Link to={`/admin/orders/${o.id}`} className="font-medium hover:text-shreem-gold">{o.order_number}</Link>
                  <span className="text-shreem-gray text-xs truncate flex-1">
                    {o.customer_name} · {formatDate(o.paid_at ?? o.created_at)}
                  </span>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-shreem-gray">No orders yet.</p>
          )}
        </section>
      </div>
    </div>
  )
}
