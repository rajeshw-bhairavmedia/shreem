import { CheckCircle2 } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { site } from '../config/site'
import { openWhatsApp } from '../lib/utils'

export default function OrderConfirmedPage() {
  const [params] = useSearchParams()
  const { state } = useLocation() as { state: { email?: string } | null }
  const orderNumber = params.get('order')

  return (
    <div className="min-h-[70vh] pt-32 pb-20 px-4 flex flex-col items-center justify-center text-center">
      <CheckCircle2 className="w-16 h-16 text-shreem-gold mb-6" />
      <h1 className="section-heading mb-4">Thank You!</h1>
      <p className="section-subheading max-w-xl mb-2">
        Your order {orderNumber && <strong className="text-shreem-black">{orderNumber}</strong>} is confirmed and
        payment has been received.
      </p>
      <p className="text-shreem-gray max-w-xl mb-8">
        {state?.email ? `We'll send updates to ${state.email}. ` : ''}We'll let you know as soon as it ships.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/collections" className="btn-primary">
          Continue Shopping
        </Link>
        <button
          onClick={() => openWhatsApp(`Hi! I have a question about my order ${orderNumber ?? ''}.`)}
          className="btn-outline"
        >
          Questions? Chat with us
        </button>
      </div>
      <p className="text-xs text-shreem-gray mt-8">
        Need help? Email {site.email} or call {site.phone.display}.
      </p>
    </div>
  )
}
