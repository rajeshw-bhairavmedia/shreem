import { RotateCcw } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { Order, Refund } from '../../shared/store'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/utils'
import { card, formatDate, input } from './shared'

const refundTone: Record<Refund['status'], string> = {
  pending: 'text-amber-700',
  processed: 'text-green-700',
  failed: 'text-red-600',
}
const refundLabel: Record<Refund['status'], string> = {
  pending: 'Processing (5-7 days to reach the customer)',
  processed: 'Refunded',
  failed: 'Failed, amount can be refunded again',
}

/** Payment details + one-click Razorpay refunds (full or partial). */
export default function RefundPanel({ order, onChange }: { order: Order; onChange: (o: Order) => void }) {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const refundable = order.total - order.refunded_amount
  const [amount, setAmount] = useState(String(refundable))
  const [reason, setReason] = useState('')
  const [cancelToo, setCancelToo] = useState(true)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)

  const loadRefunds = () =>
    supabase
      .from('refunds')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRefunds((data as Refund[]) ?? []))

  useEffect(() => {
    loadRefunds()
    setAmount(String(order.total - order.refunded_amount))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, order.refunded_amount])

  const canCancel = order.status === 'paid' || order.status === 'shipped'
  const isFull = Number(amount) === refundable

  const refund = async (e: FormEvent) => {
    e.preventDefault()
    const value = Number(amount)
    if (!confirm(`Refund ${formatPrice(value)} to ${order.customer_name}? This sends the money back through Razorpay and can't be undone.`)) return
    setBusy(true)
    setMessage(null)
    try {
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch('/api/admin-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.session?.access_token ?? ''}` },
        body: JSON.stringify({ orderId: order.id, amount: value, reason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Refund failed.')

      let note = `Refund of ${formatPrice(value)} sent to Razorpay.`
      if (cancelToo && canCancel && isFull) {
        const { error } = await supabase.rpc('cancel_order', { p_order_id: order.id })
        note += error ? ` Could not cancel the order: ${error.message}` : ' Order cancelled and items put back in stock.'
      }
      const { data: fresh } = await supabase.from('orders').select('*').eq('id', order.id).single()
      if (fresh) onChange(fresh as Order)
      setMessage({ text: note })
      setOpen(false)
      setReason('')
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Refund failed.', error: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`${card} p-6 text-sm`}>
      <h2 className="font-semibold mb-3">Payment</h2>
      <p className="text-shreem-gray">Paid {order.paid_at ? formatDate(order.paid_at) : 'not yet'}</p>
      <p className="text-shreem-gray break-all">Razorpay payment: {order.razorpay_payment_id ?? 'none'}</p>
      {order.refunded_amount > 0 && (
        <p className="mt-2 font-medium">
          Refunded {formatPrice(order.refunded_amount)} of {formatPrice(order.total)}
        </p>
      )}

      {refunds.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-shreem-black/10 pt-3">
          {refunds.map((r) => (
            <li key={r.id}>
              <div className="flex justify-between">
                <span>{formatPrice(r.amount)}</span>
                <span className="text-xs text-shreem-gray">{formatDate(r.created_at)}</span>
              </div>
              <div className={`text-xs ${refundTone[r.status]}`}>{refundLabel[r.status]}</div>
              {r.reason && <div className="text-xs text-shreem-gray">{r.reason}</div>}
            </li>
          ))}
        </ul>
      )}

      {message && <p className={`mt-3 text-xs ${message.error ? 'text-red-600' : 'text-green-700'}`}>{message.text}</p>}

      {order.razorpay_payment_id && refundable > 0 && !open && (
        <button onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700">
          <RotateCcw className="w-4 h-4" /> Refund
        </button>
      )}

      {open && (
        <form onSubmit={refund} className="mt-4 space-y-3 border-t border-shreem-black/10 pt-4">
          <div>
            <label htmlFor="refund-amount" className="text-xs font-medium">Amount (₹), up to {formatPrice(refundable)}</label>
            <input
              id="refund-amount"
              type="number"
              min={1}
              max={refundable}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${input} mt-1`}
            />
          </div>
          <div>
            <label htmlFor="refund-reason" className="text-xs font-medium">Reason (private, optional)</label>
            <input id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Size exchange not available" className={`${input} mt-1`} />
          </div>
          {canCancel && isFull && (
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={cancelToo} onChange={(e) => setCancelToo(e.target.checked)} className="mt-0.5 accent-shreem-gold" />
              Also cancel the order and put the items back in stock
            </label>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="px-4 py-2 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-60">
              {busy ? 'Refunding…' : `Refund ${formatPrice(Number(amount) || 0)}`}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-3 text-xs text-shreem-gray hover:text-shreem-black">
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
