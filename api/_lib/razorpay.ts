import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from './http.js'

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

const hmac = (secret: string, payload: string) => createHmac('sha256', secret).update(payload).digest('hex')

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
