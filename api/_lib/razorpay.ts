import { createHmac, timingSafeEqual } from 'node:crypto'
import { HttpError, env } from './http.js'

const apiBase = () => process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com'

export async function createRazorpayOrder(amountPaise: number, receipt: string, notes: Record<string, string>) {
  const auth = Buffer.from(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`).toString('base64')
  const res = await fetch(`${apiBase()}/v1/orders`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
  })
  const data = (await res.json()) as { id?: string; error?: { description?: string } }
  if (!res.ok || !data.id) {
    throw new Error(`Razorpay order failed: ${data.error?.description ?? res.status}`)
  }
  return data.id
}

/** Refunds (part of) a captured payment back to the customer's original payment method. */
export async function createRazorpayRefund(paymentId: string, amountPaise: number, notes: Record<string, string>) {
  const auth = Buffer.from(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`).toString('base64')
  const res = await fetch(`${apiBase()}/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, speed: 'normal', notes }),
  })
  const data = (await res.json()) as { id?: string; status?: string; error?: { description?: string } }
  if (!res.ok || !data.id) {
    throw new HttpError(502, `Razorpay could not refund: ${data.error?.description ?? `error ${res.status}`}`)
  }
  return { id: data.id, status: data.status === 'processed' ? 'processed' : 'pending' } as const
}

const hmac =(secret: string, payload: string) => createHmac('sha256', secret).update(payload).digest('hex')

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/** Checks the signature Razorpay Checkout returns to the browser after payment. */
export const isValidPaymentSignature = (orderId: string, paymentId: string, signature: string) =>
  safeEqual(hmac(env('RAZORPAY_KEY_SECRET'), `${orderId}|${paymentId}`), signature)

/** Checks the X-Razorpay-Signature header on webhook calls. */
export const isValidWebhookSignature = (rawBody: string, signature: string) =>
  safeEqual(hmac(env('RAZORPAY_WEBHOOK_SECRET'), rawBody), signature)
