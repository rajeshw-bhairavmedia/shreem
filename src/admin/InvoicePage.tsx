import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { gstRateFor, type Order } from '../../shared/store'
import { site } from '../config/site'
import { supabase } from '../lib/supabase'

const money = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface InvoiceLine {
  description: string
  hsn: string
  qty: number
  value: number // amount charged, GST included
  rate: number
  taxable: number
  tax: number
}

/**
 * Splits each GST-inclusive amount into taxable value + tax. The order discount is
 * spread across items in proportion to their value; shipping is taxed at the
 * highest item rate (charged together with the goods).
 */
function buildInvoice(o: Order) {
  let remainingDiscount = o.discount
  const lines: InvoiceLine[] = o.items.map((item, i) => {
    const gross = item.price * item.quantity
    const share = i === o.items.length - 1 ? remainingDiscount : Math.round((o.discount * gross) / o.subtotal)
    remainingDiscount -= share
    const value = gross - share
    const rate = gstRateFor(value / item.quantity)
    const taxable = value / (1 + rate / 100)
    return {
      description: `${item.name}${item.size || item.color ? ` (${[item.size, item.color].filter(Boolean).join(', ')})` : ''}`,
      hsn: item.hsn ?? '',
      qty: item.quantity,
      value,
      rate,
      taxable,
      tax: value - taxable,
    }
  })
  if (o.shipping) {
    const rate = Math.max(...lines.map((l) => l.rate))
    const taxable = o.shipping / (1 + rate / 100)
    lines.push({ description: 'Shipping charges', hsn: '', qty: 1, value: o.shipping, rate, taxable, tax: o.shipping - taxable })
  }
  const sum = (key: 'taxable' | 'tax' | 'value') => lines.reduce((s, l) => s + l[key], 0)
  return {
    lines,
    intraState: o.address.state === site.business.state,
    taxable: sum('taxable'),
    tax: sum('tax'),
    total: sum('value'),
  }
}

export default function InvoicePage() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('orders')
      .select('*')
      .eq('id', id!)
      .single()
      .then(({ data, error }) => (error ? setError(error.message) : setOrder(data as Order)))
  }, [id])

  if (error) return <p className="text-red-600 text-sm">{error}</p>
  if (!order) return <p className="text-shreem-gray text-sm">Loading…</p>
  if (!order.invoice_number) {
    return <p className="text-shreem-gray text-sm">No invoice: this order hasn't been paid.</p>
  }

  const inv = buildInvoice(order)
  const a = order.address
  const b = site.business

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link to={`/admin/orders/${order.id}`} className="inline-flex items-center text-sm text-shreem-gray hover:text-shreem-black">
          <ArrowLeft className="w-4 h-4 mr-1" /> {order.order_number}
        </Link>
        <button onClick={() => window.print()} className="btn-primary !px-5 !py-2 gap-2">
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>
      {!b.gstin && (
        <p className="mb-4 text-sm bg-amber-50 text-amber-800 rounded-lg px-4 py-2 print:hidden">
          Add your GSTIN in src/config/site.ts before issuing invoices.
        </p>
      )}

      <article className="bg-white rounded-xl shadow-sm p-8 text-sm text-shreem-black print:shadow-none print:rounded-none print:p-0">
        <header className="flex justify-between gap-8 border-b border-shreem-black/15 pb-6 mb-6">
          <div>
            <div className="font-display font-black text-2xl tracking-tight">SHREEM</div>
            <div className="mt-2 font-medium">{b.legalName}</div>
            <div className="text-shreem-gray max-w-xs">{b.address}</div>
            <div className="mt-1">GSTIN: <span className="font-medium">{b.gstin || 'Not set'}</span></div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold uppercase tracking-wider">Tax Invoice</div>
            <div className="mt-2">Invoice No: <span className="font-medium">{order.invoice_number}</span></div>
            <div>Invoice Date: {new Date(order.paid_at ?? order.created_at).toLocaleDateString('en-IN')}</div>
            <div>Order No: {order.order_number}</div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-shreem-gray mb-1">Bill to / Ship to</div>
            <div className="font-medium">{order.customer_name}</div>
            <div>{a.line1}</div>
            {a.line2 && <div>{a.line2}</div>}
            <div>{a.city}, {a.state} {a.pincode}</div>
            <div>Phone: {order.customer_phone}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-shreem-gray mb-1">Place of supply</div>
            <div className="font-medium">{a.state}</div>
            <div className="text-shreem-gray">{inv.intraState ? 'Intra-state (CGST + SGST)' : 'Inter-state (IGST)'}</div>
          </div>
        </section>

        <table className="w-full mb-6">
          <thead>
            <tr className="border-y border-shreem-black/15 text-left text-xs uppercase tracking-wider text-shreem-gray">
              <th className="py-2 pr-2 font-medium">Item</th>
              <th className="py-2 px-2 font-medium">HSN</th>
              <th className="py-2 px-2 font-medium text-right">Qty</th>
              <th className="py-2 px-2 font-medium text-right">Taxable value</th>
              <th className="py-2 px-2 font-medium text-right">GST</th>
              {inv.intraState ? (
                <>
                  <th className="py-2 px-2 font-medium text-right">CGST</th>
                  <th className="py-2 px-2 font-medium text-right">SGST</th>
                </>
              ) : (
                <th className="py-2 px-2 font-medium text-right">IGST</th>
              )}
              <th className="py-2 pl-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i} className="border-b border-shreem-black/5 align-top">
                <td className="py-2 pr-2">{l.description}</td>
                <td className="py-2 px-2">{l.hsn}</td>
                <td className="py-2 px-2 text-right">{l.qty}</td>
                <td className="py-2 px-2 text-right">{money(l.taxable)}</td>
                <td className="py-2 px-2 text-right">{l.rate}%</td>
                {inv.intraState ? (
                  <>
                    <td className="py-2 px-2 text-right">{money(l.tax / 2)}</td>
                    <td className="py-2 px-2 text-right">{money(l.tax / 2)}</td>
                  </>
                ) : (
                  <td className="py-2 px-2 text-right">{money(l.tax)}</td>
                )}
                <td className="py-2 pl-2 text-right">{money(l.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto max-w-xs space-y-1">
          <div className="flex justify-between"><span className="text-shreem-gray">Taxable value</span><span>₹{money(inv.taxable)}</span></div>
          {inv.intraState ? (
            <>
              <div className="flex justify-between"><span className="text-shreem-gray">CGST</span><span>₹{money(inv.tax / 2)}</span></div>
              <div className="flex justify-between"><span className="text-shreem-gray">SGST</span><span>₹{money(inv.tax / 2)}</span></div>
            </>
          ) : (
            <div className="flex justify-between"><span className="text-shreem-gray">IGST</span><span>₹{money(inv.tax)}</span></div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-xs text-shreem-gray">
              <span>Includes discount ({order.coupon_code})</span><span>−₹{money(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base border-t border-shreem-black/15 pt-2">
            <span>Total paid</span><span>₹{money(inv.total)}</span>
          </div>
        </div>

        <footer className="mt-10 pt-4 border-t border-shreem-black/10 text-xs text-shreem-gray">
          Paid online via Razorpay (payment ID {order.razorpay_payment_id}). This is a computer-generated invoice and does
          not require a signature.
        </footer>
      </article>
    </div>
  )
}
