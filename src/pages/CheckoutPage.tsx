import { Lock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { INDIAN_STATES, shippingFor } from '../../shared/store'
import { site } from '../config/site'
import { useCart } from '../context/CartContext'
import { loadRazorpay, openRazorpay, type RazorpayResponse } from '../lib/razorpay'
import { supabaseEnabled } from '../lib/supabase'
import { formatPrice } from '../lib/utils'

const DETAILS_KEY = 'shreem-checkout-details'
const emptyDetails = { name: '', email: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' }
type Details = typeof emptyDetails

function loadDetails(): Details {
  try {
    return { ...emptyDetails, ...JSON.parse(localStorage.getItem(DETAILS_KEY) ?? '{}') }
  } catch {
    return emptyDetails
  }
}

const inputClass =
  'w-full h-12 px-4 rounded-lg border border-shreem-black/10 bg-white text-sm focus:outline-none focus:border-shreem-gold transition-colors'

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.')
  return data as T
}

export default function CheckoutPage() {
  const { lines, subtotal, clear, orderOnWhatsApp } = useCart()
  const [details, setDetails] = useState<Details>(loadDetails)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  if (!supabaseEnabled) return <Navigate to="/collections" replace />

  const shipping = shippingFor(subtotal)
  const total = subtotal + shipping

  const field = (key: keyof Details) => ({
    value: details[key],
    onChange: (e: { target: { value: string } }) => setDetails({ ...details, [key]: e.target.value }),
  })

  const pay = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      localStorage.setItem(DETAILS_KEY, JSON.stringify(details))
    } catch {
      // Not critical.
    }
    try {
      await loadRazorpay()
      const order = await postJson<{
        orderNumber: string
        razorpayOrderId: string
        amount: number
        currency: string
        keyId: string
      }>('/api/create-order', {
        items: lines.map((l) => ({ slug: l.productId, size: l.size ?? '', color: l.color ?? '', quantity: l.quantity })),
        customer: details,
      })

      const onPaid = async (response: RazorpayResponse) => {
        try {
          const confirmed = await postJson<{ orderNumber: string; email: string }>('/api/verify-payment', response)
          clear()
          navigate(`/order-confirmed?order=${confirmed.orderNumber}`, { replace: true, state: { email: confirmed.email } })
        } catch (err) {
          setBusy(false)
          setError(
            `${err instanceof Error ? err.message : 'Payment verification failed.'} Your order number is ${order.orderNumber}.`,
          )
        }
      }

      openRazorpay(
        {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.razorpayOrderId,
          name: site.name,
          description: `Order ${order.orderNumber}`,
          image: `${window.location.origin}/favicon.png`,
          prefill: { name: details.name, email: details.email, contact: details.phone },
          notes: { order_number: order.orderNumber },
          theme: { color: '#D4A24A' },
          handler: onPaid,
          modal: {
            ondismiss: () => {
              setBusy(false)
              setError('Payment was cancelled. You can try again whenever you are ready.')
            },
          },
        },
        (message) => setError(`Payment failed: ${message}`),
      )
    } catch (err) {
      setBusy(false)
      setError(err instanceof Error ? err.message : 'Could not start payment.')
    }
  }

  if (lines.length === 0) {
    return (
      <div className="min-h-[60vh] pt-32 pb-20 px-4 text-center">
        <h1 className="section-heading mb-4">Checkout</h1>
        <p className="section-subheading mb-8">Your cart is empty.</p>
        <Link to="/collections" className="btn-primary">
          Shop the Collection
        </Link>
      </div>
    )
  }

  return (
    <div className="pt-24 lg:pt-32 pb-20 px-4 sm:px-6 lg:px-10">
      <h1 className="section-heading mb-10">Checkout</h1>
      <form onSubmit={pay} className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16">
        <div className="lg:col-span-3 space-y-8">
          <section>
            <h2 className="text-lg font-semibold mb-4">Contact</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="name" className="text-sm font-medium">Full name</label>
                <input id="name" required autoComplete="name" className={`${inputClass} mt-1`} {...field('name')} />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <input id="email" type="email" required autoComplete="email" className={`${inputClass} mt-1`} {...field('email')} />
              </div>
              <div>
                <label htmlFor="phone" className="text-sm font-medium">Mobile number</label>
                <input
                  id="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="numeric"
                  pattern="(\+91)?\s?[6-9][0-9]{9}"
                  title="10-digit Indian mobile number"
                  className={`${inputClass} mt-1`}
                  {...field('phone')}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Delivery address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="line1" className="text-sm font-medium">House / flat, street</label>
                <input id="line1" required autoComplete="address-line1" className={`${inputClass} mt-1`} {...field('line1')} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="line2" className="text-sm font-medium">Area, landmark (optional)</label>
                <input id="line2" autoComplete="address-line2" className={`${inputClass} mt-1`} {...field('line2')} />
              </div>
              <div>
                <label htmlFor="city" className="text-sm font-medium">City</label>
                <input id="city" required autoComplete="address-level2" className={`${inputClass} mt-1`} {...field('city')} />
              </div>
              <div>
                <label htmlFor="pincode" className="text-sm font-medium">PIN code</label>
                <input
                  id="pincode"
                  required
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  title="6-digit PIN code"
                  autoComplete="postal-code"
                  className={`${inputClass} mt-1`}
                  {...field('pincode')}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="state" className="text-sm font-medium">State</label>
                <select id="state" required autoComplete="address-level1" className={`${inputClass} mt-1`} {...field('state')}>
                  <option value="">Choose your state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>

        <aside className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 shadow-sm lg:sticky lg:top-28">
            <h2 className="text-lg font-semibold mb-4">Order summary</h2>
            <ul className="divide-y divide-shreem-black/10 mb-4">
              {lines.map((l) => (
                <li key={l.key} className="flex gap-3 py-3">
                  <div className="relative w-14 h-16 flex-shrink-0 rounded overflow-hidden bg-shreem-cream">
                    <img src={l.image} alt="" className="w-full h-full object-cover" />
                    <span className="absolute -top-0 -right-0 min-w-5 h-5 px-1 rounded-bl bg-shreem-black text-white text-[10px] flex items-center justify-center">
                      {l.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{l.name}</p>
                    <p className="text-xs text-shreem-gray">{[l.size, l.color].filter(Boolean).join(' / ')}</p>
                  </div>
                  <span className="text-sm">{formatPrice(l.price * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-2 text-sm border-t border-shreem-black/10 pt-4">
              <div className="flex justify-between">
                <span className="text-shreem-gray">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-shreem-gray">Shipping</span>
                <span>{shipping ? formatPrice(shipping) : 'Free'}</span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-2">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

            <button type="submit" disabled={busy} className="w-full btn-gold gap-2 mt-6 disabled:opacity-60">
              <Lock className="w-4 h-4" />
              {busy ? 'Processing…' : `Pay ${formatPrice(total)}`}
            </button>
            <p className="text-xs text-shreem-gray text-center mt-3">
              Secure payment by Razorpay · UPI, cards, netbanking, wallets
            </p>
            <button type="button" onClick={orderOnWhatsApp} className="w-full mt-4 text-sm text-shreem-gray hover:text-shreem-black transition-colors">
              Prefer to order on WhatsApp?
            </button>
          </div>
        </aside>
      </form>
    </div>
  )
}
