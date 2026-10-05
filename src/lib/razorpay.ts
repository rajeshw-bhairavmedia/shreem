export interface RazorpayResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description: string
  image?: string
  prefill: { name: string; email: string; contact: string }
  notes?: Record<string, string>
  theme?: { color: string }
  handler: (response: RazorpayResponse) => void
  modal?: { ondismiss?: () => void }
}

interface RazorpayInstance {
  open: () => void
  on: (event: 'payment.failed', cb: (r: { error: { description: string } }) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

let loading: Promise<void> | null = null

/** Loads Razorpay Checkout (checkout.razorpay.com) once, on demand. */
export function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => {
      loading = null
      reject(new Error('Could not load the payment window. Check your connection and try again.'))
    }
    document.body.appendChild(script)
  })
  return loading
}

export function openRazorpay(options: RazorpayOptions, onFailed: (message: string) => void) {
  const rzp = new window.Razorpay!(options)
  rzp.on('payment.failed', (r) => onFailed(r.error.description))
  rzp.open()
}
