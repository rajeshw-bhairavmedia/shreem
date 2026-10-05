import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Order } from '../../shared/store'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/utils'
import { card, formatDate, input } from './shared'

interface Customer {
  email: string
  name: string
  phone: string
  city: string
  orders: number
  spent: number
  lastOrder: string
}

type Row = Pick<Order, 'customer_name' | 'customer_email' | 'customer_phone' | 'address' | 'total' | 'created_at'>

export default function CustomersPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    supabase
      .from('orders')
      .select('customer_name, customer_email, customer_phone, address, total, created_at')
      .in('status', ['paid', 'shipped', 'delivered'])
      .order('created_at', { ascending: false })
      .limit(5000)
      .then(({ data }) => setRows((data as Row[]) ?? []))
  }, [])

  const customers = useMemo(() => {
    const byEmail = new Map<string, Customer>()
    for (const r of rows ?? []) {
      // Rows are newest first, so the first one seen holds the latest contact details.
      const c = byEmail.get(r.customer_email)
      if (c) {
        c.orders += 1
        c.spent += r.total
      } else {
        byEmail.set(r.customer_email, {
          email: r.customer_email,
          name: r.customer_name,
          phone: r.customer_phone,
          city: r.address.city,
          orders: 1,
          spent: r.total,
          lastOrder: r.created_at,
        })
      }
    }
    const q = query.trim().toLowerCase()
    return [...byEmail.values()]
      .filter((c) => !q || [c.name, c.email, c.phone, c.city].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => b.spent - a.spent)
  }, [rows, query])

  return (
    <div>
      <h1 className="text-2xl font-display font-black tracking-tight">Customers</h1>
      <p className="text-sm text-shreem-gray mt-1 mb-6">Everyone who has placed a paid order, highest spend first.</p>

      <div className="relative max-w-sm mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-shreem-gray" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone, city" className={`${input} pl-9`} />
      </div>

      <div className={`${card} overflow-x-auto`}>
        {rows === null ? (
          <p className="p-8 text-center text-shreem-gray text-sm">Loading…</p>
        ) : customers.length === 0 ? (
          <p className="p-8 text-center text-shreem-gray text-sm">No customers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-shreem-gray border-b border-shreem-black/10">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium text-right">Orders</th>
                <th className="px-4 py-3 font-medium text-right">Total spent</th>
                <th className="px-4 py-3 font-medium">Last order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-shreem-black/5">
              {customers.map((c) => (
                <tr key={c.email} className="hover:bg-shreem-cream/60">
                  <td className="px-4 py-3">
                    <Link to={`/admin/orders?status=all&q=${encodeURIComponent(c.email)}`} className="font-medium hover:text-shreem-gold">
                      {c.name}
                    </Link>
                    <div className="text-xs text-shreem-gray">{c.email}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{c.phone}</td>
                  <td className="px-4 py-3">{c.city}</td>
                  <td className="px-4 py-3 text-right">{c.orders}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatPrice(c.spent)}</td>
                  <td className="px-4 py-3 text-shreem-gray whitespace-nowrap">{formatDate(c.lastOrder)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
