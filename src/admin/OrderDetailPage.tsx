import { ArrowLeft, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Order, OrderStatus } from '../../shared/store'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/utils'
import { StatusBadge, card, formatDate, input } from './shared'

export default function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [tracking, setTracking] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('orders')
      .select('*')
      .eq('id', id!)
      .single()
      .then(({ data, error }) => {
        if (error) return setMessage(error.message)
        const o = data as Order
        setOrder(o)
        setTracking(o.tracking ?? '')
        setNotes(o.admin_notes ?? '')
      })
  }, [id])

  const save = async (changes: Partial<Order>, done: string) => {
    setBusy(true)
    setMessage(null)
    const { data, error } = await supabase.from('orders').update(changes).eq('id', id!).select('*').single()
    setBusy(false)
    if (error) return setMessage(error.message)
    setOrder(data as Order)
    setMessage(done)
  }

  const setStatus = (status: OrderStatus) => {
    if (status === 'cancelled' && !confirm('Cancel this order? Remember to refund the payment from your Razorpay dashboard.')) return
    const changes: Partial<Order> = { status }
    if (status === 'shipped') {
      changes.shipped_at = new Date().toISOString()
      changes.tracking = tracking || null
    }
    save(changes, `Order marked as ${status}.`)
  }

  if (!order) return <p className="text-shreem-gray text-sm">{message ?? 'Loading…'}</p>

  const a = order.address
  const phone = order.customer_phone

  return (
    <div>
      <Link to="/admin/orders" className="inline-flex items-center text-sm text-shreem-gray hover:text-shreem-black mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Orders
      </Link>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-display font-black tracking-tight">{order.order_number}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-shreem-gray">Placed {formatDate(order.created_at)}</span>
      </div>

      {message && <p className="mb-4 text-sm px-4 py-2 rounded-lg bg-white">{message}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className={`${card} p-6`}>
            <h2 className="font-semibold mb-4">Items</h2>
            <ul className="divide-y divide-shreem-black/5">
              {order.items.map((item, i) => (
                <li key={i} className="flex gap-4 py-3">
                  {item.image && <img src={item.image} alt="" className="w-14 h-16 object-cover rounded" />}
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-shreem-gray">
                      {[item.size && `Size ${item.size}`, item.color].filter(Boolean).join(' · ')} · Qty {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm">{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-shreem-black/10 mt-2 pt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-shreem-gray">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-shreem-gray">Shipping</span><span>{order.shipping ? formatPrice(order.shipping) : 'Free'}</span></div>
              <div className="flex justify-between font-semibold text-base"><span>Total</span><span>{formatPrice(order.total)}</span></div>
            </div>
          </section>

          <section className={`${card} p-6`}>
            <h2 className="font-semibold mb-4">Fulfilment</h2>
            {order.status === 'pending_payment' ? (
              <p className="text-sm text-shreem-gray">
                Payment not completed. The customer started checkout but did not pay, so there is nothing to ship.
              </p>
            ) : (
              <>
                <label htmlFor="tracking" className="text-sm font-medium">Courier & tracking number</label>
                <input
                  id="tracking"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="e.g. Delhivery 1234567890"
                  className={`${input} mt-1 mb-4`}
                />
                <div className="flex flex-wrap gap-2">
                  {order.status === 'paid' && (
                    <button disabled={busy} onClick={() => setStatus('shipped')} className="btn-primary !px-5 !py-2 disabled:opacity-60">
                      Mark as shipped
                    </button>
                  )}
                  {order.status === 'shipped' && (
                    <>
                      <button disabled={busy} onClick={() => setStatus('delivered')} className="btn-primary !px-5 !py-2 disabled:opacity-60">
                        Mark as delivered
                      </button>
                      <button disabled={busy} onClick={() => save({ tracking: tracking || null }, 'Tracking saved.')} className="btn-outline !px-5 !py-2">
                        Save tracking
                      </button>
                    </>
                  )}
                  {(order.status === 'paid' || order.status === 'shipped') && (
                    <button disabled={busy} onClick={() => setStatus('cancelled')} className="px-5 py-2 rounded-full text-sm text-red-600 hover:bg-red-50">
                      Cancel order
                    </button>
                  )}
                </div>
                {order.shipped_at && <p className="text-xs text-shreem-gray mt-3">Shipped {formatDate(order.shipped_at)}</p>}
              </>
            )}
          </section>

          <section className={`${card} p-6`}>
            <h2 className="font-semibold mb-3">Private notes</h2>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${input} h-auto py-2`} />
            <button disabled={busy} onClick={() => save({ admin_notes: notes || null }, 'Notes saved.')} className="btn-outline !px-5 !py-2 mt-3">
              Save notes
            </button>
          </section>
        </div>

        <div className="space-y-6">
          <section className={`${card} p-6 text-sm`}>
            <h2 className="font-semibold mb-3">Customer</h2>
            <p className="font-medium">{order.customer_name}</p>
            <p><a href={`mailto:${order.customer_email}`} className="text-shreem-gray hover:text-shreem-gold">{order.customer_email}</a></p>
            <p><a href={`tel:+91${phone}`} className="text-shreem-gray hover:text-shreem-gold">+91 {phone}</a></p>
            <a
              href={`https://wa.me/91${phone}?text=${encodeURIComponent(`Hi ${order.customer_name}, this is Shreem Lifestyle about your order ${order.order_number}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-[#128C7E] font-medium"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp customer
            </a>
          </section>
          <section className={`${card} p-6 text-sm`}>
            <h2 className="font-semibold mb-3">Ship to</h2>
            <p className="whitespace-pre-line">
              {[order.customer_name, a.line1, a.line2, `${a.city}, ${a.state} ${a.pincode}`, `Phone: ${phone}`].filter(Boolean).join('\n')}
            </p>
          </section>
          <section className={`${card} p-6 text-sm`}>
            <h2 className="font-semibold mb-3">Payment</h2>
            <p className="text-shreem-gray">Paid {order.paid_at ? formatDate(order.paid_at) : '—'}</p>
            <p className="text-shreem-gray break-all">Razorpay payment: {order.razorpay_payment_id ?? '—'}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
